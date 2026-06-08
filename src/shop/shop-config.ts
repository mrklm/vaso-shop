export const SHOP_NETLIFY_SITE_URL = "https://vaso-shop.netlify.app";
export const SHOP_PUBLIC_SITE_URL = "https://mrklm.github.io/vaso-shop/";
export const SHOP_MONDIAL_RELAY_BRAND = import.meta.env.VITE_MONDIAL_RELAY_BRAND ?? "";
export const DEFAULT_HERO_GALLERY_TRANSITION_MS = 8200;
export const DEFAULT_HERO_GALLERY_FADE_IN_MS = 3200;
export const DEFAULT_HERO_GALLERY_FADE_OUT_MS = 3200;

const SHOP_PUBLIC_CONFIG_URL = `${import.meta.env.BASE_URL}config/shop-config.json`;

export type ShopStatusState = "open" | "slowed" | "holiday" | "closed";
export type ShopShippingModeId = "relay" | "home";

export interface ShopColor {
  id: string;
  label: string;
  hex: string;
  previewHex?: string;
  opacity?: number;
  previewEmissiveIntensity?: number;
  previewShading?: number;
  available: boolean;
}

export interface ShopHeroImage {
  path: string;
  enabled: boolean;
}

export interface ShopHeroGalleryConfig {
  transitionMs: number;
  fadeInMs: number;
  fadeOutMs: number;
}

export interface ShopMessagesConfig {
  shippingLeadTime: string;
  temporaryNotice: string;
  atelierNote: string;
  materialPlaNote: string;
  warningPla: string;
  colorPreviewNote: string;
  contactPrompt: string;
  contactButtonLabel: string;
  contactEmail: string;
  contactEmailSubject: string;
  contactEmailBody: string;
}

export interface ShopPricingConfig {
  priceCents: number;
}

export interface ShopPrinterProfile {
  name: string;
  width: number;
  depth: number;
  height: number;
}

export interface ShopPrinterVolumeConfig {
  enforce: boolean;
  activeProfile: string;
  profiles: ShopPrinterProfile[];
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
  suspendRelay: boolean;
  suspendHomeDelivery: boolean;
  unsupportedMessage: string;
  countries: ShopShippingCountryConfig[];
}

export interface ShopPublicConfig {
  pricing: ShopPricingConfig;
  printerVolume: ShopPrinterVolumeConfig;
  colors: ShopColor[];
  heroImages: ShopHeroImage[];
  heroGallery: ShopHeroGalleryConfig;
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

function normalizeColorId(rawColor: Record<string, unknown>, index: number): string {
  const explicitId = normalizeString(rawColor.id).trim();
  if (explicitId) {
    return explicitId;
  }

  const label = normalizeString(rawColor.label).trim();
  if (!label) {
    return `color-${index + 1}`;
  }

  return (
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `color-${index + 1}`
  );
}

function normalizeColor(value: unknown, index: number): ShopColor | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = normalizeString(value.label).trim();
  const hex = normalizeString(value.hex, "#d9d2c7").trim() || "#d9d2c7";
  const previewHex = normalizeString(value.previewHex).trim();
  const opacity = Math.min(1, Math.max(0.08, normalizeNumber(value.opacity, 1)));
  const previewEmissiveIntensity = Math.min(
    0.5,
    Math.max(0, normalizeNumber(value.previewEmissiveIntensity, 0)),
  );
  const previewShading = Math.min(100, Math.max(0, normalizeNumber(value.previewShading, 50)));
  if (!label) {
    return null;
  }

  return {
    id: normalizeColorId(value, index),
    label,
    hex,
    previewHex: previewHex || undefined,
    opacity,
    previewEmissiveIntensity,
    previewShading,
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

function normalizePrinterProfile(value: unknown): ShopPrinterProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = normalizeString(value.name).trim();
  if (!name) {
    return null;
  }

  return {
    name,
    width: Math.max(1, normalizeNumber(value.width, 220)),
    depth: Math.max(1, normalizeNumber(value.depth, 220)),
    height: Math.max(1, normalizeNumber(value.height, 250)),
  };
}

function normalizeShopConfig(rawValue: unknown): ShopPublicConfig {
  const rawConfig = isRecord(rawValue) ? rawValue : {};
  const rawPricing = isRecord(rawConfig.pricing) ? rawConfig.pricing : {};
  const rawPrinterVolume = isRecord(rawConfig.printerVolume) ? rawConfig.printerVolume : {};
  const rawMessages = isRecord(rawConfig.messages) ? rawConfig.messages : {};
  const rawStatus = isRecord(rawConfig.shopStatus) ? rawConfig.shopStatus : {};
  const rawShipping = isRecord(rawConfig.shipping) ? rawConfig.shipping : {};
  const rawHeroGallery = isRecord(rawConfig.heroGallery) ? rawConfig.heroGallery : {};
  const statusState = normalizeStatusState(rawStatus.state);
  const printerProfiles = Array.isArray(rawPrinterVolume.profiles)
    ? rawPrinterVolume.profiles
        .map((profile) => normalizePrinterProfile(profile))
        .filter((profile): profile is ShopPrinterProfile => profile !== null)
    : [];
  const activePrinterProfile = normalizeString(rawPrinterVolume.activeProfile).trim();
  const safePrinterProfiles =
    printerProfiles.length > 0
      ? printerProfiles
      : [{ name: "Alfawise U30", width: 220, depth: 220, height: 250 }];
  const safeActivePrinterProfile = safePrinterProfiles.some(
    (profile) => profile.name === activePrinterProfile,
  )
    ? activePrinterProfile
    : safePrinterProfiles[0].name;

  const rawLegacyPrices = isRecord(rawPricing.pricesCents) ? rawPricing.pricesCents : {};
  const fallbackPriceCents = Math.max(
    0,
    normalizeNumber(rawLegacyPrices.M ?? rawLegacyPrices.S ?? rawLegacyPrices.L, 0),
  );
  return {
    pricing: {
      priceCents: Math.max(0, normalizeNumber(rawPricing.priceCents, fallbackPriceCents)),
    },
    printerVolume: {
      enforce: normalizeBoolean(rawPrinterVolume.enforce, false),
      activeProfile: safeActivePrinterProfile,
      profiles: safePrinterProfiles,
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
    heroGallery: {
      transitionMs: Math.max(
        1000,
        normalizeNumber(rawHeroGallery.transitionMs, DEFAULT_HERO_GALLERY_TRANSITION_MS),
      ),
      fadeInMs: Math.max(
        0,
        normalizeNumber(rawHeroGallery.fadeInMs, DEFAULT_HERO_GALLERY_FADE_IN_MS),
      ),
      fadeOutMs: Math.max(
        0,
        normalizeNumber(rawHeroGallery.fadeOutMs, DEFAULT_HERO_GALLERY_FADE_OUT_MS),
      ),
    },
    messages: {
      shippingLeadTime: normalizeString(rawMessages.shippingLeadTime).trim(),
      temporaryNotice: normalizeString(rawMessages.temporaryNotice).trim(),
      atelierNote: normalizeString(rawMessages.atelierNote).trim(),
      materialPlaNote:
        normalizeString(rawMessages.materialPlaNote).trim() ||
        "Bioplastique sourcé à partir d'amidon végétal, principalement issu du maïs.",
      warningPla: normalizeString(rawMessages.warningPla).trim(),
      colorPreviewNote:
        normalizeString(rawMessages.colorPreviewNote).trim() ||
        "Les aperçus 3D vous donnent une belle idée de la teinte, avec de légères nuances possibles selon la lumière, la matière et l'impression finale.",
      contactPrompt:
        normalizeString(rawMessages.contactPrompt).trim() || "Vous avez des questions ?",
      contactButtonLabel:
        normalizeString(rawMessages.contactButtonLabel).trim() || "Contactez nous",
      contactEmail: normalizeString(rawMessages.contactEmail).trim(),
      contactEmailSubject:
        normalizeString(rawMessages.contactEmailSubject).trim() || "Contact VASO SHOP",
      contactEmailBody:
        normalizeString(rawMessages.contactEmailBody) ||
        "Nom :\nPrenom :\nN° de tel :\nMail :\n\nMessage :\n",
    },
    shopStatus: {
      state: statusState,
      label: normalizeString(rawStatus.label).trim() || DEFAULT_STATUS_LABELS[statusState],
      message: normalizeString(rawStatus.message).trim(),
      allowCheckout: normalizeBoolean(
        rawStatus.allowCheckout,
        statusState === "open" || statusState === "slowed",
      ),
    },
    shipping: {
      suspendRelay: normalizeBoolean(rawShipping.suspendRelay, false),
      suspendHomeDelivery: normalizeBoolean(rawShipping.suspendHomeDelivery, false),
      unsupportedMessage:
        normalizeString(rawShipping.unsupportedMessage).trim() ||
        DEFAULT_SHIPPING_UNSUPPORTED_MESSAGE,
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
  return Math.max(0, config.pricing.priceCents);
}

export function getShopEffectiveShippingPriceCents(
  _config: ShopPublicConfig,
  _productPriceCents: number,
  shippingPriceCents: number,
): number {
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
