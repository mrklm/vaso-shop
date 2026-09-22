import {
  getConfiguredProductPriceCents,
  getConfiguredShippingOption,
  getEffectiveShippingPriceCents,
  readShopConfig,
} from "./_shop-config.mjs";
import { getStore } from "@netlify/blobs";

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

function buildSafeOrderRef(orderReference) {
  return (
    `${orderReference ?? "unknown"}`
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "unknown"
  );
}

function cloneJsonObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function normalizeCheckoutItem(rawItem) {
  if (!rawItem || typeof rawItem !== "object") {
    return null;
  }

  return {
    seed: rawItem.seed,
    version: rawItem.version,
    heightMm: rawItem.heightMm,
    minDiameterMm: rawItem.minDiameterMm,
    maxDiameterMm: rawItem.maxDiameterMm,
    waterproofInsertLabel: rawItem.waterproofInsertLabel,
    solifloreChoice: rawItem.solifloreChoice,
    solifloreChoiceLabel: rawItem.solifloreChoiceLabel,
    wantsSoliflore: rawItem.forceTestTubeSupport ? true : rawItem.wantsSoliflore === true,
    forceTestTubeSupport: rawItem.forceTestTubeSupport === true,
    suppressTestTubeSupport: rawItem.suppressTestTubeSupport === true,
    material: rawItem.material,
    params: cloneJsonObject(rawItem.params),
    colorId: rawItem.colorId,
    colorLabel: rawItem.colorLabel,
    quantity: Math.min(99, Math.max(1, Math.trunc(Number(rawItem.quantity) || 1))),
  };
}

function getCheckoutItems(payload) {
  if (Array.isArray(payload?.items)) {
    return payload.items.map(normalizeCheckoutItem).filter(Boolean).slice(0, 12);
  }

  const legacyItem = normalizeCheckoutItem({
    seed: payload?.seed,
    version: payload?.version,
    heightMm: payload?.heightMm,
    minDiameterMm: payload?.minDiameterMm,
    maxDiameterMm: payload?.maxDiameterMm,
    waterproofInsertLabel: payload?.waterproofInsertLabel,
    solifloreChoice: payload?.solifloreChoice,
    solifloreChoiceLabel: payload?.solifloreChoiceLabel,
    wantsSoliflore: payload?.wantsSoliflore,
    forceTestTubeSupport: payload?.forceTestTubeSupport,
    suppressTestTubeSupport: payload?.suppressTestTubeSupport,
    material: payload?.material,
    colorId: payload?.colorId,
    colorLabel: payload?.colorLabel,
    params: payload?.params,
    quantity: 1,
  });

  return legacyItem ? [legacyItem] : [];
}

function appendMetadata(params, scope, metadata) {
  Object.entries(metadata).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    params.set(`${scope}[${key}]`, value);
  });
}

function buildOrderMetadata(
  payload,
  items,
  shippingOption,
  productPriceCents,
  shippingPriceCents,
  orderTotalCents,
  orderReference,
) {
  const firstItem = items[0] ?? {};
  const cartSummary = items
    .map((item) => `${item.quantity}x ${item.seed} ${item.colorLabel}`)
    .join(" | ");
  const cartItemsJson = JSON.stringify(items);

  return {
    order_ref: orderReference,
    item_count: normalizeMetadataValue(items.reduce((total, item) => total + item.quantity, 0), 40),
    cart_summary: normalizeMetadataValue(cartSummary, 500),
    cart_items_json: cartItemsJson.length <= 500 ? cartItemsJson : "",
    seed: normalizeMetadataValue(firstItem.seed, 50),
    version: normalizeMetadataValue(firstItem.version, 32),
    height_mm: normalizeMetadataValue(firstItem.heightMm, 32),
    min_diameter_mm: normalizeMetadataValue(firstItem.minDiameterMm, 32),
    max_diameter_mm: normalizeMetadataValue(firstItem.maxDiameterMm, 32),
    waterproof_insert_label: normalizeMetadataValue(firstItem.waterproofInsertLabel, 120),
    soliflore_choice: normalizeMetadataValue(firstItem.solifloreChoice, 8),
    soliflore_choice_label: normalizeMetadataValue(firstItem.solifloreChoiceLabel, 120),
    wants_soliflore: normalizeMetadataValue(firstItem.solifloreChoice === "yes" ? "yes" : "no", 8),
    force_test_tube_support: normalizeMetadataValue(
      firstItem.forceTestTubeSupport ? "yes" : "no",
      8,
    ),
    suppress_test_tube_support: normalizeMetadataValue(
      firstItem.suppressTestTubeSupport ? "yes" : "no",
      8,
    ),
    material: normalizeMetadataValue(firstItem.material, 32),
    product_price_cents: normalizeMetadataValue(productPriceCents, 40),
    color_id: normalizeMetadataValue(firstItem.colorId, 64),
    color_label: normalizeMetadataValue(firstItem.colorLabel, 128),
    customer_first_name: normalizeMetadataValue(payload.customerFirstName, 120),
    customer_last_name: normalizeMetadataValue(payload.customerLastName, 120),
    customer_email: normalizeMetadataValue(payload.customerEmail, 160),
    customer_phone: normalizeMetadataValue(payload.customerPhone, 60),
    customer_address: normalizeMetadataValue(payload.customerAddress, 200),
    customer_city: normalizeMetadataValue(payload.customerCity, 120),
    customer_postal_code: normalizeMetadataValue(payload.customerPostalCode, 40),
    customer_country: normalizeMetadataValue(payload.customerCountry, 120),
    customer_message: normalizeMetadataValue(payload.customerMessage, 500),
    shipping_mode: normalizeMetadataValue(shippingOption.label, 80),
    shipping_provider: normalizeMetadataValue(shippingOption.provider, 120),
    shipping_country: normalizeMetadataValue(payload.customerCountry, 120),
    shipping_price_cents: normalizeMetadataValue(shippingPriceCents, 40),
    relay_id: normalizeMetadataValue(payload.relayId, 80),
    relay_name: normalizeMetadataValue(payload.relayName, 160),
    relay_address: normalizeMetadataValue(payload.relayAddress, 200),
    relay_postal_code: normalizeMetadataValue(payload.relayPostalCode, 40),
    relay_city: normalizeMetadataValue(payload.relayCity, 120),
    relay_country: normalizeMetadataValue(payload.relayCountry, 120),
    order_total_cents: normalizeMetadataValue(orderTotalCents, 40),
  };
}

function buildProductionVaseFiles(orderReference, items) {
  return items.map((item, index) => {
    const seedLabel = `${Math.abs(Math.trunc(Number(item.seed) || 0))}`.padStart(8, "0");
    return {
      filename: `${orderReference}-vase-${index + 1}-${seedLabel}.json`,
      mimeType: "application/json",
      content: {
        schema: "vaso-production-vase-v1",
        orderRef: orderReference,
        itemIndex: index,
        seed: item.seed,
        version: item.version,
        colorId: item.colorId,
        colorLabel: item.colorLabel,
        material: item.material,
        waterproofInsertLabel: item.waterproofInsertLabel,
        solifloreChoice: item.solifloreChoice,
        solifloreChoiceLabel: item.solifloreChoiceLabel,
        forceTestTubeSupport: item.forceTestTubeSupport,
        suppressTestTubeSupport: item.suppressTestTubeSupport,
        quantity: item.quantity,
        params: item.params,
      },
    };
  });
}

async function persistPendingProductionOrder(orderReference, items) {
  const ordersStore = getStore("vaso-orders");
  const safeOrderRef = buildSafeOrderRef(orderReference);
  const createdAt = new Date().toISOString();

  await ordersStore.setJSON(
    `pending-production/${safeOrderRef}.json`,
    {
      schema: "vaso-pending-production-order-v1",
      orderRef: orderReference,
      createdAt,
      cartItems: items,
      productionVaseFiles: buildProductionVaseFiles(orderReference, items),
    },
    {
      metadata: {
        orderRef: orderReference,
        seed: items[0]?.seed ?? "",
        createdAt,
      },
    },
  );
}

function buildLineItems(params, items, payload, shippingOption, productPriceCents, shippingPriceCents) {
  const currency = (readEnv("STRIPE_CURRENCY") ?? "eur").trim().toLowerCase();
  const productName = (readEnv("STRIPE_PRODUCT_NAME") ?? "Vase Vaso").trim();

  items.forEach((item, index) => {
    const productDescription = [
      `Vase N° ${item.seed}`,
      item.colorLabel,
      `${item.heightMm} mm`,
      item.solifloreChoice === "yes" ? "Soliflore avec tube à essai" : item.waterproofInsertLabel,
    ]
      .filter(Boolean)
      .join(" · ");

    params.set(`line_items[${index}][quantity]`, `${item.quantity}`);
    params.set(`line_items[${index}][price_data][currency]`, currency);
    params.set(`line_items[${index}][price_data][unit_amount]`, `${productPriceCents}`);
    params.set(`line_items[${index}][price_data][product_data][name]`, productName);
    params.set(`line_items[${index}][price_data][product_data][description]`, productDescription);
  });

  if (shippingPriceCents > 0) {
    const shippingIndex = items.length;
    params.set(`line_items[${shippingIndex}][quantity]`, "1");
    params.set(`line_items[${shippingIndex}][price_data][currency]`, currency);
    params.set(`line_items[${shippingIndex}][price_data][unit_amount]`, `${shippingPriceCents}`);
    params.set(`line_items[${shippingIndex}][price_data][product_data][name]`, shippingOption.label);
    params.set(
      `line_items[${shippingIndex}][price_data][product_data][description]`,
      `${shippingOption.provider} · ${payload.customerCountry}`,
    );
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "La commande n'a pas pu être lue.";
  }

  const items = getCheckoutItems(payload);
  if (items.length === 0) {
    return "Le panier est vide.";
  }

  const requiredFields = [
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

  for (const item of items) {
    const requiredItemFields = [
      "seed",
      "version",
      "heightMm",
      "minDiameterMm",
      "maxDiameterMm",
      "waterproofInsertLabel",
      "material",
      "colorLabel",
      "solifloreChoice",
    ];

    for (const field of requiredItemFields) {
      const value = item[field];
      if (value === null || value === undefined || `${value}`.trim().length === 0) {
        return `Le champ ${field} est requis pour chaque vase du panier.`;
      }
    }

    if (!["yes", "no"].includes(`${item.solifloreChoice}`)) {
      return "Le choix soliflore Oui/Non est requis pour chaque vase du panier.";
    }

    if (!item.params || typeof item.params !== "object") {
      return "Les paramètres de production du vase sont requis pour chaque vase du panier.";
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
  const checkoutItems = getCheckoutItems(payload);
  const itemCount = checkoutItems.reduce((total, item) => total + item.quantity, 0);

  let shopConfig;
  let shippingOption;
  let productPriceCents;
  let productSubtotalCents;
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
    productSubtotalCents = productPriceCents * itemCount;
    shippingPriceCents = getEffectiveShippingPriceCents(
      shopConfig,
      productSubtotalCents,
      shippingOption.priceCents,
    );
    orderTotalCents = productSubtotalCents + shippingPriceCents;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "La livraison sélectionnée n'a pas pu être validée.";
    return jsonResponse({ error: message }, 400, corsHeaders);
  }

  const firstCheckoutItem = checkoutItems[0];
  const orderReference = buildOrderReference(firstCheckoutItem.seed);
  const publicSiteUrl = getPublicSiteUrl(origin);
  const checkoutSeeds = checkoutItems.flatMap((item) =>
    Array.from({ length: item.quantity }, () => `${item.seed}`),
  );
  const successUrl = new URL("checkout-success.html", publicSiteUrl);
  successUrl.searchParams.set("order_ref", orderReference);
  successUrl.searchParams.set("seed", `${firstCheckoutItem.seed}`);
  successUrl.searchParams.set("seeds", checkoutSeeds.join(","));
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

  const cancelUrl = new URL("checkout-cancelled.html", publicSiteUrl);
  cancelUrl.searchParams.set("order_ref", orderReference);
  cancelUrl.searchParams.set("seed", `${firstCheckoutItem.seed}`);

  const metadata = buildOrderMetadata(
    payload,
    checkoutItems,
    shippingOption,
    productPriceCents,
    shippingPriceCents,
    orderTotalCents,
    orderReference,
  );

  try {
    await persistPendingProductionOrder(orderReference, checkoutItems);

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
    buildLineItems(params, checkoutItems, payload, shippingOption, productPriceCents, shippingPriceCents);

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
