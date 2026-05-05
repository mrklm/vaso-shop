export type ShopShippingModeId = "relay" | "home";

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

const RELAY_LABEL = "Point relais";
const HOME_LABEL = "Livraison à domicile";

export const SHOP_UNSUPPORTED_SHIPPING_MESSAGE =
  "Nous contacter avant commande pour organiser la livraison vers ce pays.";

export const SHOP_SHIPPING_COUNTRY_CONFIGS: ShopShippingCountryConfig[] = [
  {
    country: "France",
    options: [
      { id: "relay", label: RELAY_LABEL, provider: "Mondial Relay", priceCents: 410 },
      { id: "home", label: HOME_LABEL, provider: "Mondial Relay Domicile", priceCents: 749 },
    ],
  },
  {
    country: "Belgique",
    options: [
      { id: "relay", label: RELAY_LABEL, provider: "Mondial Relay", priceCents: 460 },
      { id: "home", label: HOME_LABEL, provider: "Mondial Relay Domicile", priceCents: 1250 },
    ],
  },
  {
    country: "Luxembourg",
    options: [
      { id: "relay", label: RELAY_LABEL, provider: "Mondial Relay", priceCents: 460 },
      { id: "home", label: HOME_LABEL, provider: "Mondial Relay Domicile", priceCents: 1250 },
    ],
  },
  {
    country: "Pays-Bas",
    options: [
      { id: "relay", label: RELAY_LABEL, provider: "Mondial Relay", priceCents: 660 },
      { id: "home", label: HOME_LABEL, provider: "Mondial Relay Domicile", priceCents: 1250 },
    ],
  },
  {
    country: "Espagne",
    options: [
      { id: "relay", label: RELAY_LABEL, provider: "Mondial Relay", priceCents: 660 },
      { id: "home", label: HOME_LABEL, provider: "Mondial Relay Domicile", priceCents: 1270 },
    ],
  },
  {
    country: "Portugal",
    options: [
      { id: "relay", label: RELAY_LABEL, provider: "Mondial Relay", priceCents: 660 },
      { id: "home", label: HOME_LABEL, provider: "Mondial Relay Domicile", priceCents: 1270 },
    ],
  },
  {
    country: "Italie",
    options: [
      { id: "relay", label: RELAY_LABEL, provider: "Mondial Relay", priceCents: 660 },
      { id: "home", label: HOME_LABEL, provider: "Mondial Relay Domicile", priceCents: 1270 },
    ],
  },
  {
    country: "Pologne",
    options: [{ id: "relay", label: RELAY_LABEL, provider: "Mondial Relay", priceCents: 720 }],
  },
  {
    country: "Allemagne",
    options: [{ id: "home", label: HOME_LABEL, provider: "Mondial Relay Domicile", priceCents: 1250 }],
  },
  {
    country: "Autriche",
    options: [{ id: "home", label: HOME_LABEL, provider: "Mondial Relay Domicile", priceCents: 1600 }],
  },
];

export function getShopShippingOptions(country: string): ShopShippingOption[] {
  const normalizedCountry = country.trim();
  if (!normalizedCountry) {
    return [];
  }

  return SHOP_SHIPPING_COUNTRY_CONFIGS.find((config) => config.country === normalizedCountry)?.options ?? [];
}

export function getShopShippingOption(
  country: string,
  modeId: string,
): ShopShippingOption | null {
  return getShopShippingOptions(country).find((option) => option.id === modeId) ?? null;
}
