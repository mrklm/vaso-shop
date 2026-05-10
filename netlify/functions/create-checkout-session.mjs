import {
  getConfiguredProductPriceCents,
  getConfiguredShippingOption,
  getEffectiveShippingPriceCents,
  readShopConfig,
} from "./_shop-config.mjs";

const DEFAULT_NETLIFY_ORIGIN = "https://vaso-shop.netlify.app";
const DEFAULT_GITHUB_PAGES_ORIGIN = "https://mrklm.github.io";
const DEFAULT_GITHUB_PAGES_SITE_URL = "https://mrklm.github.io/vaso-shop/";
const DEFAULT_ALLOWED_ORIGINS = [
  DEFAULT_NETLIFY_ORIGIN,
  DEFAULT_GITHUB_PAGES_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function readEnv(name) {
  if (globalThis.Netlify?.env?.get) {
    const value = globalThis.Netlify.env.get(name);
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return process.env[name];
}

function parseJson(request) {
  return request.json().catch(() => null);
}

function normalizeMetadataValue(value, maxLength = 500) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeSiteUrl(value) {
  const trimmedValue = `${value ?? ""}`.trim();
  if (!trimmedValue) {
    return "";
  }

  return trimmedValue.endsWith("/") ? trimmedValue : `${trimmedValue}/`;
}

function getPublicSiteUrl(origin) {
  const configuredPublicSiteUrl = normalizeSiteUrl(readEnv("SHOP_PUBLIC_SITE_URL"));
  if (configuredPublicSiteUrl) {
    return configuredPublicSiteUrl;
  }

  if (origin === DEFAULT_GITHUB_PAGES_ORIGIN) {
    return DEFAULT_GITHUB_PAGES_SITE_URL;
  }

  if (origin === DEFAULT_NETLIFY_ORIGIN) {
    return normalizeSiteUrl(DEFAULT_NETLIFY_ORIGIN);
  }

  if (origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173") {
    return normalizeSiteUrl(origin);
  }

  return DEFAULT_GITHUB_PAGES_SITE_URL;
}

function buildAllowedOrigins(requestOrigin) {
  const allowedOrigins = new Set(DEFAULT_ALLOWED_ORIGINS);
  const envOrigins = [
    readEnv("URL"),
    readEnv("DEPLOY_URL"),
    readEnv("DEPLOY_PRIME_URL"),
    readEnv("SHOP_ALLOWED_ORIGINS"),
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  for (const origin of envOrigins) {
    allowedOrigins.add(origin);
  }

  if (requestOrigin) {
    allowedOrigins.add(requestOrigin);
  }

  return allowedOrigins;
}

function buildCorsHeaders(origin, requestOrigin) {
  const allowedOrigins = buildAllowedOrigins(requestOrigin);
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : DEFAULT_NETLIFY_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

function buildOrderReference(seed) {
  const seedLabel = `${Math.abs(Math.trunc(Number(seed) || 0))}`.padStart(8, "0");
  const timeLabel = Date.now().toString(36).toUpperCase();
  return `VSO-${seedLabel}-${timeLabel}`;
}

function appendMetadata(params, scope, metadata) {
  Object.entries(metadata).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    params.set(`${scope}[${key}]`, value);
  });
}

function buildOrderMetadata(payload, shippingOption, productPriceCents, shippingPriceCents, orderTotalCents, orderReference) {
  return {
    order_ref: orderReference,
    seed: normalizeMetadataValue(payload.seed, 50),
    version: normalizeMetadataValue(payload.version, 32),
    height_mm: normalizeMetadataValue(payload.heightMm, 32),
    min_diameter_mm: normalizeMetadataValue(payload.minDiameterMm, 32),
    max_diameter_mm: normalizeMetadataValue(payload.maxDiameterMm, 32),
    material: normalizeMetadataValue(payload.material, 32),
    product_price_cents: normalizeMetadataValue(productPriceCents, 40),
    color_id: normalizeMetadataValue(payload.colorId, 64),
    color_label: normalizeMetadataValue(payload.colorLabel, 128),
    shipping_mode: normalizeMetadataValue(shippingOption.label, 80),
    shipping_provider: normalizeMetadataValue(shippingOption.provider, 120),
    shipping_country: normalizeMetadataValue(payload.customerCountry, 120),
    shipping_price_cents: normalizeMetadataValue(shippingPriceCents, 40),
    relay_id: normalizeMetadataValue(payload.relayId, 80),
    relay_name: normalizeMetadataValue(payload.relayName, 160),
    relay_city: normalizeMetadataValue(payload.relayCity, 120),
    relay_country: normalizeMetadataValue(payload.relayCountry, 120),
    order_total_cents: normalizeMetadataValue(orderTotalCents, 40),
  };
}

function buildLineItems(params, payload, shippingOption, productPriceCents, shippingPriceCents) {
  const currency = (readEnv("STRIPE_CURRENCY") ?? "eur").trim().toLowerCase();
  const productName = (readEnv("STRIPE_PRODUCT_NAME") ?? "Vase Vaso").trim();
  const productDescription = [
    `Vase N° ${payload.seed}`,
    payload.colorLabel,
    `${payload.heightMm} mm`,
  ]
    .filter(Boolean)
    .join(" · ");

  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", currency);
  params.set("line_items[0][price_data][unit_amount]", `${productPriceCents}`);
  params.set("line_items[0][price_data][product_data][name]", productName);
  params.set("line_items[0][price_data][product_data][description]", productDescription);

  if (shippingPriceCents > 0) {
    params.set("line_items[1][quantity]", "1");
    params.set("line_items[1][price_data][currency]", currency);
    params.set("line_items[1][price_data][unit_amount]", `${shippingPriceCents}`);
    params.set("line_items[1][price_data][product_data][name]", shippingOption.label);
    params.set(
      "line_items[1][price_data][product_data][description]",
      `${shippingOption.provider} · ${payload.customerCountry}`,
    );
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "La commande n'a pas pu être lue.";
  }

  const requiredFields = [
    "seed",
    "version",
    "heightMm",
    "minDiameterMm",
    "maxDiameterMm",
    "material",
    "colorLabel",
    "customerFirstName",
    "customerLastName",
    "customerEmail",
    "customerAddress",
    "customerCity",
    "customerPostalCode",
    "customerCountry",
    "shippingModeId",
  ];

  for (const field of requiredFields) {
    const value = payload[field];
    if (value === null || value === undefined || `${value}`.trim().length === 0) {
      return `Le champ ${field} est requis pour lancer le paiement.`;
    }
  }

  return null;
}

export default async (request) => {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin, requestOrigin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405, corsHeaders);
  }

  if (!origin) {
    return jsonResponse({ error: "Origine requise." }, 403, corsHeaders);
  }

  const allowedOrigins = buildAllowedOrigins(requestOrigin);
  if (!allowedOrigins.has(origin)) {
    return jsonResponse({ error: "Origine non autorisée." }, 403, corsHeaders);
  }

  const stripeSecretKey = readEnv("STRIPE_SECRET_KEY")?.trim();
  if (!stripeSecretKey) {
    return jsonResponse(
      {
        error:
          "Le paiement Stripe n'est pas encore configuré sur le serveur. Ajoute STRIPE_SECRET_KEY dans Netlify.",
      },
      503,
      corsHeaders,
    );
  }

  const payload = await parseJson(request);
  const validationError = validatePayload(payload);
  if (validationError) {
    return jsonResponse({ error: validationError }, 400, corsHeaders);
  }

  let shopConfig;
  let shippingOption;
  let productPriceCents;
  let shippingPriceCents;
  let orderTotalCents;
  try {
    shopConfig = await readShopConfig();
    if (!shopConfig.shopStatus.allowCheckout) {
      throw new Error(
        shopConfig.shopStatus.message ||
          `La commande est momentanément indisponible : ${shopConfig.shopStatus.label}.`,
      );
    }

    shippingOption = getConfiguredShippingOption(
      shopConfig,
      payload.customerCountry,
      payload.shippingModeId,
    );
    productPriceCents = getConfiguredProductPriceCents(shopConfig);
    shippingPriceCents = getEffectiveShippingPriceCents(
      shopConfig,
      productPriceCents,
      shippingOption.priceCents,
    );
    orderTotalCents = productPriceCents + shippingPriceCents;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "La livraison sélectionnée n'a pas pu être validée.";
    return jsonResponse({ error: message }, 400, corsHeaders);
  }

  const orderReference = buildOrderReference(payload.seed);
  const publicSiteUrl = getPublicSiteUrl(origin);
  const successUrl = new URL("checkout-success.html", publicSiteUrl);
  successUrl.searchParams.set("order_ref", orderReference);
  successUrl.searchParams.set("seed", `${payload.seed}`);
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

  const cancelUrl = new URL("checkout-cancelled.html", publicSiteUrl);
  cancelUrl.searchParams.set("order_ref", orderReference);
  cancelUrl.searchParams.set("seed", `${payload.seed}`);

  const metadata = buildOrderMetadata(
    payload,
    shippingOption,
    productPriceCents,
    shippingPriceCents,
    orderTotalCents,
    orderReference,
  );

  try {
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("locale", "fr");
    params.set("success_url", successUrl.toString());
    params.set("cancel_url", cancelUrl.toString());
    params.set("client_reference_id", orderReference);
    params.set("customer_email", `${payload.customerEmail}`.trim());
    params.set("billing_address_collection", "auto");
    params.set("payment_intent_data[description]", `Commande Vaso ${orderReference}`);
    appendMetadata(params, "metadata", metadata);
    appendMetadata(params, "payment_intent_data[metadata]", metadata);
    buildLineItems(params, payload, shippingOption, productPriceCents, shippingPriceCents);

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const stripePayload = await stripeResponse.json().catch(() => null);
    if (!stripeResponse.ok) {
      const stripeMessage =
        stripePayload &&
        typeof stripePayload === "object" &&
        stripePayload.error &&
        typeof stripePayload.error.message === "string"
          ? stripePayload.error.message
          : "Stripe a refusé la création de la session.";

      return jsonResponse({ error: stripeMessage }, 502, corsHeaders);
    }

    if (!stripePayload || typeof stripePayload.url !== "string" || stripePayload.url.length === 0) {
      return jsonResponse(
        { error: "Stripe n'a pas renvoyé d'URL de paiement exploitable." },
        502,
        corsHeaders,
      );
    }

    return jsonResponse({ orderRef: orderReference, url: stripePayload.url }, 200, corsHeaders);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Une erreur inattendue est survenue lors de la préparation du paiement.";

    return jsonResponse({ error: message }, 500, corsHeaders);
  }
};
