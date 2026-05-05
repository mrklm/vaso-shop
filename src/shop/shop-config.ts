export const SHOP_NETLIFY_SITE_URL = "https://vaso-shop.netlify.app";
export const SHOP_VASE_PRICE_CENTS = 2500;
export const SHOP_VASE_PRICE_LABEL = "25 € TTC";
export const SHOP_SHIPPING_PLACEHOLDER_LABEL = "À préciser après le choix du mode de livraison";

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
