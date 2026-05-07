import { readFile } from "node:fs/promises";

const CONFIG_FILE_URL = new URL("../../public/config/shop-config.json", import.meta.url);
const DEFAULT_SHIPPING_UNSUPPORTED_MESSAGE =
  "Nous contacter avant commande pour organiser la livraison vers ce pays.";
const DEFAULT_STATUS_LABELS = {
  open: "Boutique ouverte",
  slowed: "Boutique ralentie",
  holiday: "Vacances",
  closed: "Fermeture temporaire",
};

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value, fallback = 0) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeStatusState(value) {
  if (value === "open" || value === "slowed" || value === "holiday" || value === "closed") {
    return value;
  }

  return "open";
}

function normalizeSizeKey(value) {
  if (value === "S" || value === "M" || value === "L") {
    return value;
  }

  return "M";
}

function normalizeShippingOption(value) {
  if (!isRecord(value)) {
    return null;
  }

  const id = normalizeString(value.id).trim();
  if (id !== "relay" && id !== "home") {
    return null;
  }

  return {
    id,
    label: normalizeString(value.label).trim() || (id === "relay" ? "Point relais" : "Livraison à domicile"),
    provider: normalizeString(value.provider).trim(),
    priceCents: Math.max(0, normalizeNumber(value.priceCents, 0)),
  };
}

function normalizeShippingCountry(value) {
  if (!isRecord(value)) {
    return null;
  }

  const country = normalizeString(value.country).trim();
  if (!country) {
    return null;
  }

  const options = Array.isArray(value.options)
    ? value.options
        .map((option) => normalizeShippingOption(option))
        .filter(Boolean)
    : [];

  return {
    country,
    options,
  };
}

function normalizeShopConfig(rawValue) {
  const rawConfig = isRecord(rawValue) ? rawValue : {};
  const rawPricing = isRecord(rawConfig.pricing) ? rawConfig.pricing : {};
  const rawStatus = isRecord(rawConfig.shopStatus) ? rawConfig.shopStatus : {};
  const rawShipping = isRecord(rawConfig.shipping) ? rawConfig.shipping : {};
  const rawPrices = isRecord(rawPricing.pricesCents) ? rawPricing.pricesCents : {};
  const statusState = normalizeStatusState(rawStatus.state);

  return {
    pricing: {
      defaultSize: normalizeSizeKey(rawPricing.defaultSize),
      pricesCents: {
        S: Math.max(0, normalizeNumber(rawPrices.S, 0)),
        M: Math.max(0, normalizeNumber(rawPrices.M, 0)),
        L: Math.max(0, normalizeNumber(rawPrices.L, 0)),
      },
      freeShippingThresholdCents: Math.max(0, normalizeNumber(rawPricing.freeShippingThresholdCents, 0)),
    },
    shopStatus: {
      state: statusState,
      label: normalizeString(rawStatus.label).trim() || DEFAULT_STATUS_LABELS[statusState],
      message: normalizeString(rawStatus.message).trim(),
      allowCheckout: normalizeBoolean(rawStatus.allowCheckout, statusState === "open" || statusState === "slowed"),
    },
    shipping: {
      unsupportedMessage:
        normalizeString(rawShipping.unsupportedMessage).trim() || DEFAULT_SHIPPING_UNSUPPORTED_MESSAGE,
      countries: Array.isArray(rawShipping.countries)
        ? rawShipping.countries
            .map((country) => normalizeShippingCountry(country))
            .filter(Boolean)
        : [],
    },
  };
}

export async function readShopConfig() {
  const fileContents = await readFile(CONFIG_FILE_URL, "utf8");
  return normalizeShopConfig(JSON.parse(fileContents));
}

export function getConfiguredProductPriceCents(config) {
  const { defaultSize, pricesCents } = config.pricing;
  const defaultSizePrice = pricesCents[defaultSize];
  return defaultSizePrice || pricesCents.M || pricesCents.S || pricesCents.L || 0;
}

export function getEffectiveShippingPriceCents(config, productPriceCents, shippingPriceCents) {
  const freeShippingThresholdCents = Math.max(0, config.pricing.freeShippingThresholdCents);
  if (freeShippingThresholdCents > 0 && productPriceCents >= freeShippingThresholdCents) {
    return 0;
  }

  return Math.max(0, shippingPriceCents);
}

export function getConfiguredShippingOption(config, country, modeId) {
  const normalizedCountry = `${country ?? ""}`.trim();
  const normalizedModeId = `${modeId ?? ""}`.trim();
  const countryConfig = config.shipping.countries.find((entry) => entry.country === normalizedCountry);
  if (!countryConfig) {
    throw new Error(config.shipping.unsupportedMessage);
  }

  const option = countryConfig.options.find((entry) => entry.id === normalizedModeId);
  if (!option) {
    throw new Error("Le mode de livraison sélectionné n'est pas disponible pour ce pays.");
  }

  return option;
}
