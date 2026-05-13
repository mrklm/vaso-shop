import type {
  ShopPublicConfig,
  ShopShippingCountryConfig,
  ShopShippingOption,
} from "./shop-config";

export type { ShopShippingModeId, ShopShippingOption, ShopShippingCountryConfig } from "./shop-config";

export function isShopShippingOptionSuspended(
  config: ShopPublicConfig,
  optionId: string,
): boolean {
  if (optionId === "relay") {
    return config.shipping.suspendRelay;
  }

  if (optionId === "home") {
    return config.shipping.suspendHomeDelivery;
  }

  return false;
}

export function getShopShippingOptions(
  config: ShopPublicConfig,
  country: string,
): ShopShippingOption[] {
  const normalizedCountry = country.trim();
  if (!normalizedCountry) {
    return [];
  }

  return (
    config.shipping.countries.find(
      (shippingCountry: ShopShippingCountryConfig) => shippingCountry.country === normalizedCountry,
    )?.options ?? []
  );
}

export function getShopShippingOption(
  config: ShopPublicConfig,
  country: string,
  modeId: string,
): ShopShippingOption | null {
  return getShopShippingOptions(config, country).find((option) => option.id === modeId) ?? null;
}
