export const SHOP_NETLIFY_SITE_URL = "https://vaso-shop.netlify.app";

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
