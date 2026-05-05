import crypto from "node:crypto";

const DEFAULT_TOLERANCE_SECONDS = 300;

function readEnv(name) {
  if (globalThis.Netlify?.env?.get) {
    const value = globalThis.Netlify.env.get(name);
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return process.env[name];
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function parseStripeSignatureHeader(signatureHeader) {
  if (!signatureHeader) {
    throw new Error("L'en-tête Stripe-Signature est absent.");
  }

  let timestamp = null;
  const signatures = [];

  for (const item of signatureHeader.split(",")) {
    const [key, value] = item.split("=", 2).map((part) => part.trim());
    if (!key || !value) {
      continue;
    }

    if (key === "t") {
      timestamp = Number.parseInt(value, 10);
      continue;
    }

    if (key === "v1") {
      signatures.push(value);
    }
  }

  if (!Number.isFinite(timestamp) || !timestamp) {
    throw new Error("Le timestamp Stripe-Signature est invalide.");
  }

  if (signatures.length === 0) {
    throw new Error("Aucune signature Stripe v1 n'a été trouvée.");
  }

  return { signatures, timestamp };
}

function secureCompare(left, right) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyStripeSignature(rawBody, signatureHeader, endpointSecret) {
  const { signatures, timestamp } = parseStripeSignatureHeader(signatureHeader);
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (Math.abs(nowInSeconds - timestamp) > DEFAULT_TOLERANCE_SECONDS) {
    throw new Error("La signature Stripe a expiré ou l'horloge du serveur est décalée.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", endpointSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const hasMatchingSignature = signatures.some((signature) =>
    secureCompare(signature, expectedSignature),
  );

  if (!hasMatchingSignature) {
    throw new Error("La signature Stripe ne correspond pas au payload reçu.");
  }
}

function parseStripeEvent(rawBody) {
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error("Le payload Stripe n'est pas un JSON valide.");
  }
}

function normalizeCheckoutSession(session) {
  const metadata = session.metadata ?? {};
  const customerDetails = session.customer_details ?? {};
  const shippingDetails = session.shipping_details ?? {};
  const customerAddress = customerDetails.address ?? {};

  return {
    orderRef: metadata.order_ref ?? session.client_reference_id ?? null,
    seed: metadata.seed ?? null,
    version: metadata.version ?? null,
    colorId: metadata.color_id ?? null,
    colorLabel: metadata.color_label ?? null,
    material: metadata.material ?? null,
    heightMm: metadata.height_mm ?? null,
    minDiameterMm: metadata.min_diameter_mm ?? null,
    maxDiameterMm: metadata.max_diameter_mm ?? null,
    customerName: metadata.customer_name ?? customerDetails.name ?? shippingDetails.name ?? null,
    customerEmail: metadata.customer_email ?? session.customer_email ?? customerDetails.email ?? null,
    customerPhone: metadata.customer_phone ?? customerDetails.phone ?? shippingDetails.phone ?? null,
    customerAddress: metadata.customer_address ?? customerAddress.line1 ?? null,
    customerCity: metadata.customer_city ?? customerAddress.city ?? null,
    customerPostalCode: metadata.customer_postal_code ?? customerAddress.postal_code ?? null,
    customerCountry: metadata.customer_country ?? customerAddress.country ?? null,
    customerMessage: metadata.customer_message ?? null,
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
    checkoutStatus: session.status ?? null,
    paymentStatus: session.payment_status ?? null,
    stripeSessionId: session.id ?? null,
    stripeCustomerId: session.customer ?? null,
    stripePaymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
  };
}

function logWebhookEvent(eventType, payload) {
  console.info(`[stripe-webhook] ${eventType} ${JSON.stringify(payload)}`);
}

function buildGenericEventSummary(event) {
  const object = event?.data?.object;
  return {
    eventId: event?.id ?? null,
    type: event?.type ?? null,
    created: event?.created ?? null,
    livemode: event?.livemode ?? null,
    objectType: object?.object ?? null,
  };
}

function handleStripeEvent(event) {
  const session = event?.data?.object;

  switch (event.type) {
    case "checkout.session.completed": {
      logWebhookEvent(event.type, {
        ...buildGenericEventSummary(event),
        order: normalizeCheckoutSession(session),
      });
      break;
    }

    case "checkout.session.async_payment_succeeded": {
      logWebhookEvent(event.type, {
        ...buildGenericEventSummary(event),
        order: normalizeCheckoutSession(session),
      });
      break;
    }

    case "checkout.session.async_payment_failed": {
      logWebhookEvent(event.type, {
        ...buildGenericEventSummary(event),
        order: normalizeCheckoutSession(session),
      });
      break;
    }

    case "checkout.session.expired": {
      logWebhookEvent(event.type, {
        ...buildGenericEventSummary(event),
        order: normalizeCheckoutSession(session),
      });
      break;
    }

    default: {
      logWebhookEvent(event.type ?? "unknown", buildGenericEventSummary(event));
      break;
    }
  }
}

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  }

  const endpointSecret = readEnv("STRIPE_WEBHOOK_SECRET")?.trim();
  if (!endpointSecret) {
    return jsonResponse(
      {
        error:
          "Le webhook Stripe n'est pas encore configuré. Ajoute STRIPE_WEBHOOK_SECRET dans Netlify.",
      },
      503,
    );
  }

  const signatureHeader = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  try {
    verifyStripeSignature(rawBody, signatureHeader, endpointSecret);
    const event = parseStripeEvent(rawBody);
    handleStripeEvent(event);

    return jsonResponse({ received: true, type: event.type ?? null }, 200);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Le webhook Stripe n'a pas pu être validé.";

    console.error(`[stripe-webhook] rejected ${message}`);
    return jsonResponse({ error: message }, 400);
  }
};
