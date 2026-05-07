export const SHOP_NETLIFY_SITE_URL = "https://vaso-shop.netlify.app";
export const SHOP_VASE_PRICE_CENTS = 2500;
export const SHOP_MONDIAL_RELAY_BRAND = "";

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
