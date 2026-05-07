export const SHOP_NETLIFY_SITE_URL = "https://vaso-shop.netlify.app";
export const SHOP_MONDIAL_RELAY_BRAND = "";

const SHOP_PUBLIC_CONFIG_URL = `${import.meta.env.BASE_URL}config/shop-config.json`;

export type ShopSizeKey = "S" | "M" | "L";
export type ShopStatusState = "open" | "slowed" | "holiday" | "closed";
export type ShopShippingModeId = "relay" | "home";

export interface ShopColor {
  id: string;
  label: string;
  hex: string;
  available: boolean;
}

export interface ShopHeroImage {
  path: string;
  enabled: boolean;
}

export interface ShopMessagesConfig {
  shippingLeadTime: string;
  temporaryNotice: string;
  atelierNote: string;
  warningPla: string;
  contactPrompt: string;
  contactButtonLabel: string;
}

export interface ShopPricingConfig {
  defaultSize: ShopSizeKey;
  pricesCents: Record<ShopSizeKey, number>;
  freeShippingThresholdCents: number;
}

export interface ShopStatusConfig {
  state: ShopStatusState;
  label: string;
  message: string;
  allowCheckout: boolean;
}

export interface ShopShippingOption {
  id: ShopShippingModeId;
  label: string;
  provider: string;
  priceCents: number;
}

export interface ShopShippingCountryConfig {
  country: string;
  options: ShopShippingOption[];
}

export interface ShopShippingConfig {
  unsupportedMessage: string;
  countries: ShopShippingCountryConfig[];
}

export interface ShopPublicConfig {
  pricing: ShopPricingConfig;
  colors: ShopColor[];
  heroImages: ShopHeroImage[];
  messages: ShopMessagesConfig;
  shopStatus: ShopStatusConfig;
  shipping: ShopShippingConfig;
}

const DEFAULT_STATUS_LABELS: Record<ShopStatusState, string> = {
  open: "Boutique ouverte",
  slowed: "Boutique ralentie",
  holiday: "Vacances",
  closed: "Fermeture temporaire",
};

const DEFAULT_SHIPPING_UNSUPPORTED_MESSAGE =
  "Nous contacter avant commande pour organiser la livraison vers ce pays.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeStatusState(value: unknown): ShopStatusState {
  if (value === "open" || value === "slowed" || value === "holiday" || value === "closed") {
    return value;
  }

  return "open";
}

function normalizeSizeKey(value: unknown): ShopSizeKey {
  if (value === "S" || value === "M" || value === "L") {
    return value;
  }

  return "M";
}

function normalizeColorId(rawColor: Record<string, unknown>, index: number): string {
  const explicitId = normalizeString(rawColor.id).trim();
  if (explicitId) {
    return explicitId;
  }

  const label = normalizeString(rawColor.label).trim();
  if (!label) {
    return `color-${index + 1}`;
  }

  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `color-${index + 1}`;
}

function normalizeColor(value: unknown, index: number): ShopColor | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = normalizeString(value.label).trim();
  const hex = normalizeString(value.hex, "#d9d2c7").trim() || "#d9d2c7";
  if (!label) {
    return null;
  }

  return {
    id: normalizeColorId(value, index),
    label,
    hex,
    available: normalizeBoolean(value.available, true),
  };
}

function normalizeHeroImage(value: unknown): ShopHeroImage | null {
  if (typeof value === "string" && value.trim()) {
    return { path: value.trim(), enabled: true };
  }

  if (!isRecord(value)) {
    return null;
  }

  const path = normalizeString(value.path).trim();
  if (!path) {
    return null;
  }

  return {
    path,
    enabled: normalizeBoolean(value.enabled, true),
  };
}

function normalizeShippingOption(value: unknown): ShopShippingOption | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = normalizeString(value.id).trim();
  if (id !== "relay" && id !== "home") {
    return null;
  }

  const label = normalizeString(value.label).trim();
  const provider = normalizeString(value.provider).trim();
  const priceCents = Math.max(0, normalizeNumber(value.priceCents, 0));

  return {
    id,
    label: label || (id === "relay" ? "Point relais" : "Livraison à domicile"),
    provider,
    priceCents,
  };
}

function normalizeShippingCountry(value: unknown): ShopShippingCountryConfig | null {
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
        .filter((option): option is ShopShippingOption => option !== null)
    : [];

  return {
    country,
    options,
  };
}

function normalizeShopConfig(rawValue: unknown): ShopPublicConfig {
  const rawConfig = isRecord(rawValue) ? rawValue : {};
  const rawPricing = isRecord(rawConfig.pricing) ? rawConfig.pricing : {};
  const rawMessages = isRecord(rawConfig.messages) ? rawConfig.messages : {};
  const rawStatus = isRecord(rawConfig.shopStatus) ? rawConfig.shopStatus : {};
  const rawShipping = isRecord(rawConfig.shipping) ? rawConfig.shipping : {};
  const statusState = normalizeStatusState(rawStatus.state);

  return {
    pricing: {
      defaultSize: normalizeSizeKey(rawPricing.defaultSize),
      pricesCents: {
        S: Math.max(0, normalizeNumber(rawPricing.pricesCents && isRecord(rawPricing.pricesCents) ? rawPricing.pricesCents.S : undefined, 0)),
        M: Math.max(0, normalizeNumber(rawPricing.pricesCents && isRecord(rawPricing.pricesCents) ? rawPricing.pricesCents.M : undefined, 0)),
        L: Math.max(0, normalizeNumber(rawPricing.pricesCents && isRecord(rawPricing.pricesCents) ? rawPricing.pricesCents.L : undefined, 0)),
      },
      freeShippingThresholdCents: Math.max(0, normalizeNumber(rawPricing.freeShippingThresholdCents, 0)),
    },
    colors: Array.isArray(rawConfig.colors)
      ? rawConfig.colors
          .map((color, index) => normalizeColor(color, index))
          .filter((color): color is ShopColor => color !== null)
      : [],
    heroImages: Array.isArray(rawConfig.heroImages)
      ? rawConfig.heroImages
          .map((image) => normalizeHeroImage(image))
          .filter((image): image is ShopHeroImage => image !== null)
      : [],
    messages: {
      shippingLeadTime: normalizeString(rawMessages.shippingLeadTime).trim(),
      temporaryNotice: normalizeString(rawMessages.temporaryNotice).trim(),
      atelierNote: normalizeString(rawMessages.atelierNote).trim(),
      warningPla: normalizeString(rawMessages.warningPla).trim(),
      contactPrompt: normalizeString(rawMessages.contactPrompt).trim() || "Vous avez des questions ?",
      contactButtonLabel: normalizeString(rawMessages.contactButtonLabel).trim() || "Contactez nous",
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
            .filter((country): country is ShopShippingCountryConfig => country !== null)
        : [],
    },
  };
}

export async function fetchShopConfig(): Promise<ShopPublicConfig> {
  const response = await fetch(SHOP_PUBLIC_CONFIG_URL, {
    cache: "no-cache",
  });

  if (!response.ok) {
    throw new Error("La configuration boutique n'a pas pu être chargée.");
  }

  return normalizeShopConfig(await response.json());
}

export function getShopBasePriceCents(config: ShopPublicConfig): number {
  const { defaultSize, pricesCents } = config.pricing;
  const sizePrice = pricesCents[defaultSize];

  if (sizePrice > 0) {
    return sizePrice;
  }

  return pricesCents.M || pricesCents.S || pricesCents.L || 0;
}

export function getShopEffectiveShippingPriceCents(
  config: ShopPublicConfig,
  productPriceCents: number,
  shippingPriceCents: number,
): number {
  const freeShippingThresholdCents = Math.max(0, config.pricing.freeShippingThresholdCents);
  if (freeShippingThresholdCents > 0 && productPriceCents >= freeShippingThresholdCents) {
    return 0;
  }

  return Math.max(0, shippingPriceCents);
}

export function isShopCheckoutAllowed(config: ShopPublicConfig): boolean {
  return config.shopStatus.allowCheckout;
}

export function resolveShopConfigAssetPath(assetPath: string): string {
  const normalizedAssetPath = assetPath.trim();
  if (!normalizedAssetPath) {
    return "";
  }

  if (/^(https?:)?\/\//i.test(normalizedAssetPath) || normalizedAssetPath.startsWith("data:")) {
    return normalizedAssetPath;
  }

  const baseUrl = import.meta.env.BASE_URL || "/";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const relativeAssetPath = normalizedAssetPath.replace(/^\/+/, "");
  return `${normalizedBaseUrl}${relativeAssetPath}`;
}

export function formatShopPriceFromCents(valueInCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(valueInCents / 100);
}

export function getShopStripeCheckoutEndpoint(): string {
  if (typeof window === "undefined") {
    return `${SHOP_NETLIFY_SITE_URL}/.netlify/functions/create-checkout-session`;
  }

  const { origin, hostname, pathname } = window.location;
  const isGitHubPagesHost = hostname === "mrklm.github.io" || pathname.startsWith("/vaso-shop/");

  return isGitHubPagesHost
    ? `${SHOP_NETLIFY_SITE_URL}/.netlify/functions/create-checkout-session`
    : `${origin}/.netlify/functions/create-checkout-session`;
}
