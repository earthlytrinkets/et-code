import type { CartProduct } from "@/types/product";

export const PENDING_CART_PRODUCT_KEY = "et_pending_cart_product";
export const POST_AUTH_REDIRECT_KEY = "et_post_auth_redirect";
export const OPEN_AUTH_EVENT = "et:open-auth";

export const queueCartAuthIntent = (product: CartProduct, redirectTo = "/cart") => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_CART_PRODUCT_KEY, JSON.stringify(product));
  localStorage.setItem(POST_AUTH_REDIRECT_KEY, redirectTo);
  window.dispatchEvent(new Event(OPEN_AUTH_EVENT));
};

export const queueAuthRedirect = (redirectTo = "/cart") => {
  if (typeof window === "undefined") return;
  localStorage.setItem(POST_AUTH_REDIRECT_KEY, redirectTo);
  window.dispatchEvent(new Event(OPEN_AUTH_EVENT));
};
