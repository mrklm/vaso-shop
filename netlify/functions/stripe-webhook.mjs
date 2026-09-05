import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

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

function parseCartItemsMetadata(value) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function buildSafeOrderRef(orderReference) {
  return (
    `${orderReference ?? "unknown"}`
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "unknown"
  );
}

async function readPendingProductionOrder(orderReference) {
  if (!orderReference) {
    return null;
  }

  try {
    const ordersStore = getStore("vaso-orders");
    return await ordersStore.get(`pending-production/${buildSafeOrderRef(orderReference)}.json`, {
      type: "json",
    });
  } catch (error) {
    console.error(
      `[stripe-webhook] pending production read failed ${
        error instanceof Error ? error.message : "unexpected error"
      }`,
    );
    return null;
  }
}

function mergeProductionData(order, pendingProductionOrder) {
  if (!pendingProductionOrder || typeof pendingProductionOrder !== "object") {
    return order;
  }

  const productionVaseFiles = Array.isArray(pendingProductionOrder.productionVaseFiles)
    ? pendingProductionOrder.productionVaseFiles
    : [];
  const cartItems = Array.isArray(pendingProductionOrder.cartItems)
    ? pendingProductionOrder.cartItems
    : order.cartItems;

  return {
    ...order,
    cartItems,
    productionVaseFiles,
    productionDataAvailable: productionVaseFiles.length > 0,
  };
}

function normalizeCheckoutSession(session) {
  const metadata = session.metadata ?? {};
  const customerDetails = session.customer_details ?? {};
  const customerAddress = customerDetails.address ?? {};
  const cartItems = parseCartItemsMetadata(metadata.cart_items_json);

  return {
    orderRef: metadata.order_ref ?? session.client_reference_id ?? null,
    itemCount: metadata.item_count ?? null,
    cartSummary: metadata.cart_summary ?? null,
    cartItems,
    seed: metadata.seed ?? null,
    version: metadata.version ?? null,
    colorId: metadata.color_id ?? null,
    colorLabel: metadata.color_label ?? null,
    material: metadata.material ?? null,
    heightMm: metadata.height_mm ?? null,
    minDiameterMm: metadata.min_diameter_mm ?? null,
    maxDiameterMm: metadata.max_diameter_mm ?? null,
    waterproofInsertLabel: metadata.waterproof_insert_label ?? null,
    solifloreChoice: metadata.soliflore_choice ?? null,
    solifloreChoiceLabel: metadata.soliflore_choice_label ?? null,
    wantsSoliflore: metadata.wants_soliflore ?? null,
    forceTestTubeSupport: metadata.force_test_tube_support ?? null,
    suppressTestTubeSupport: metadata.suppress_test_tube_support ?? null,
    customerFirstName: metadata.customer_first_name ?? null,
    customerLastName: metadata.customer_last_name ?? null,
    customerEmail: metadata.customer_email ?? customerDetails.email ?? session.customer_email ?? null,
    customerPhone: metadata.customer_phone ?? customerDetails.phone ?? null,
    customerAddress: metadata.customer_address ?? customerAddress.line1 ?? null,
    customerCity: metadata.customer_city ?? customerAddress.city ?? null,
    customerPostalCode: metadata.customer_postal_code ?? customerAddress.postal_code ?? null,
    customerCountry: metadata.customer_country ?? customerAddress.country ?? null,
    customerMessage: metadata.customer_message ?? null,
    shippingMode: metadata.shipping_mode ?? null,
    shippingProvider: metadata.shipping_provider ?? null,
    shippingCountry: metadata.shipping_country ?? metadata.customer_country ?? null,
    relayId: metadata.relay_id ?? null,
    relayName: metadata.relay_name ?? null,
    relayAddress: metadata.relay_address ?? null,
    relayPostalCode: metadata.relay_postal_code ?? null,
    relayCity: metadata.relay_city ?? null,
    relayCountry: metadata.relay_country ?? null,
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

function normalizeOrderRecord(order, event) {
  return {
    ...order,
    stripeEventId: event?.id ?? null,
    stripeEventType: event?.type ?? null,
    livemode: event?.livemode ?? null,
    createdAt:
      typeof event?.created === "number"
        ? new Date(event.created * 1000).toISOString()
        : new Date().toISOString(),
  };
}

function formatAmountFromMinorUnits(amount, currency) {
  if (!Number.isFinite(amount)) {
    return null;
  }

  const normalizedCurrency = `${currency ?? "EUR"}`.toUpperCase();
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function formatOrderDateTime(createdAt) {
  if (typeof createdAt !== "string" || createdAt.trim().length === 0) {
    return null;
  }

  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(parsedDate);
}

function getOrderCartItems(order) {
  if (Array.isArray(order.cartItems) && order.cartItems.length > 0) {
    return order.cartItems.filter((item) => item && typeof item === "object");
  }

  return [
    {
      seed: order.seed,
      version: order.version,
      heightMm: order.heightMm,
      minDiameterMm: order.minDiameterMm,
      maxDiameterMm: order.maxDiameterMm,
      waterproofInsertLabel: order.waterproofInsertLabel,
      solifloreChoiceLabel: order.solifloreChoiceLabel,
      forceTestTubeSupport: order.forceTestTubeSupport === "yes",
      suppressTestTubeSupport: order.suppressTestTubeSupport === "yes",
      material: order.material,
      colorLabel: order.colorLabel,
      quantity: order.itemCount ?? 1,
    },
  ];
}

function formatBooleanLabel(value) {
  return value === true || value === "yes" ? "oui" : "non";
}

function formatOrderItemLine(item, index) {
  const dimensions = [
    item.heightMm ? `H ${item.heightMm} mm` : "",
    item.minDiameterMm && item.maxDiameterMm
      ? `Ø ${item.minDiameterMm}-${item.maxDiameterMm} mm`
      : "",
  ].filter(Boolean);
  const details = [
    item.colorLabel,
    item.waterproofInsertLabel,
    item.solifloreChoiceLabel,
    `support tube ${formatBooleanLabel(item.forceTestTubeSupport)}`,
    item.suppressTestTubeSupport ? "support supprime" : "",
    item.material,
  ].filter(Boolean);

  return [
    `${index + 1}. ${item.quantity ?? 1}x vase n° ${item.seed ?? "n/a"}`,
    dimensions.join(", "),
    details.join(", "),
  ]
    .filter(Boolean)
    .join(" - ");
}

function buildDiscordMessage(order) {
  const customerFullName = [order.customerFirstName, order.customerLastName]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .trim();

  const addressLines = [
    order.customerAddress,
    [order.customerPostalCode, order.customerCity].filter(Boolean).join(" ").trim(),
    order.customerCountry,
  ].filter((value) => typeof value === "string" && value.trim().length > 0);

  const relayLines = [
    order.relayName,
    order.relayAddress,
    [order.relayPostalCode, order.relayCity].filter(Boolean).join(" ").trim(),
    order.relayCountry,
  ].filter((value) => typeof value === "string" && value.trim().length > 0);
  const orderItems = getOrderCartItems(order);
  const productionFileCount = Array.isArray(order.productionVaseFiles)
    ? order.productionVaseFiles.length
    : 0;

  const lines = [
    "**Nouvelle commande Vaso**",
    `Date : ${formatOrderDateTime(order.createdAt) ?? "n/a"}`,
    `Reference : ${order.orderRef ?? "n/a"}`,
    `Panier : ${order.cartSummary ?? `Vase n° ${order.seed ?? "n/a"}`}`,
    `Articles : ${order.itemCount ?? "1"}`,
    "Vases :",
    ...orderItems.map(formatOrderItemLine),
    `JSON production : ${productionFileCount > 0 ? `${productionFileCount} fichier(s)` : "absent"}`,
    `Montant : ${formatAmountFromMinorUnits(order.amountTotal, order.currency) ?? "n/a"}`,
    `Client : ${customerFullName || "n/a"}`,
    `Email : ${order.customerEmail ?? "n/a"}`,
    `Telephone : ${order.customerPhone ?? "non renseigne"}`,
    `Adresse : ${addressLines.join(", ") || "n/a"}`,
    `Livraison : ${order.shippingMode ?? "n/a"}${order.shippingProvider ? ` · ${order.shippingProvider}` : ""}`,
  ];

  if (relayLines.length > 0) {
    lines.push(`Point relais : ${relayLines.join(", ")}`);
  }

  if (order.customerMessage) {
    lines.push(`Message client : ${order.customerMessage}`);
  }

  return lines.join("\n");
}

async function sendDiscordNotification(order) {
  const webhookUrl = readEnv("DISCORD_WEBHOOK_URL")?.trim();
  if (!webhookUrl) {
    return false;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      username: "Commandes Vaso Shop",
      content: buildDiscordMessage(order),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(
      `Discord a refuse la notification (${response.status})${responseText ? `: ${responseText}` : ""}`,
    );
  }

  return true;
}

async function persistOrder(order) {
  const ordersStore = getStore("vaso-orders");
  const safeOrderRef = buildSafeOrderRef(order.orderRef);
  const key = `orders/${order.createdAt ?? new Date().toISOString()}-${safeOrderRef}.json`;
  const customerFullName = [order.customerFirstName, order.customerLastName]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .trim();

  await ordersStore.setJSON(key, order, {
    metadata: {
      orderRef: order.orderRef ?? "",
      seed: order.seed ?? "",
      colorLabel: order.colorLabel ?? "",
      customerFullName,
      createdAt: order.createdAt ?? "",
    },
  });
}

async function handleStripeEvent(event) {
  const session = event?.data?.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const baseOrder = normalizeCheckoutSession(session);
      const pendingProductionOrder = await readPendingProductionOrder(baseOrder.orderRef);
      const order = normalizeOrderRecord(
        mergeProductionData(baseOrder, pendingProductionOrder),
        event,
      );
      logWebhookEvent(event.type, {
        ...buildGenericEventSummary(event),
        order,
      });
      await persistOrder(order);
      try {
        await sendDiscordNotification(order);
      } catch (error) {
        console.error(
          `[stripe-webhook] discord notification failed ${
            error instanceof Error ? error.message : "unexpected error"
          }`,
        );
      }
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
    await handleStripeEvent(event);

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
