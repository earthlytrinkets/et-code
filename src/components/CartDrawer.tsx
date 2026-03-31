import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Tag, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckout } from "@/contexts/CheckoutContext";
import GracefulImage from "@/components/GracefulImage";
import { OPEN_AUTH_EVENT } from "@/lib/auth-intent";
import { supabase } from "@/integrations/supabase/client";
import { calculateCouponDiscount, type ManagedCoupon } from "@/lib/coupons";

const CartDrawer = () => {
  const { items, updateQuantity, removeFromCart, totalItems, totalPrice, drawerOpen, closeDrawer } = useCart();
  const { user } = useAuth();
  const { appliedCoupon, discountAmount, setCoupon } = useCheckout();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponError("");
    setCouponLoading(true);
    const { data, error } = await supabase.rpc("validate_coupon_code", {
      p_code: code, p_user_id: user?.id ?? null, p_subtotal: totalPrice,
    });
    setCouponLoading(false);
    const coupon = Array.isArray(data) ? data[0] : data;
    if (error || !coupon) { setCouponError(error?.message || "Invalid or expired coupon."); return; }
    const managed: ManagedCoupon = {
      code: coupon.code,
      discount_type: coupon.discount_type as ManagedCoupon["discount_type"],
      discount_value: Number(coupon.discount_value),
      min_order_value: Number(coupon.min_order_value),
      max_discount_amount: coupon.max_discount_amount === null ? null : Number(coupon.max_discount_amount),
    };
    setCoupon(managed, calculateCouponDiscount(totalPrice, managed));
  };

  const removeCoupon = () => { setCoupon(null, 0); setCouponInput(""); setCouponError(""); };

  // Lock body scroll when open (including mobile Safari)
  useEffect(() => {
    if (!drawerOpen) return;
    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [drawerOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    if (drawerOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen, closeDrawer]);

  return createPortal(
    <AnimatePresence>
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Your Cart
                </h2>
                {totalItems > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-body text-xs font-semibold text-primary">
                    {totalItems} {totalItems === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                  <ShoppingBag size={40} className="text-muted-foreground/30" />
                  <p className="font-display text-base font-semibold text-foreground">Your cart is empty</p>
                  <p className="font-body text-sm text-muted-foreground">Browse our collection and add items you love.</p>
                  <button
                    onClick={() => { closeDrawer(); navigate("/shop"); }}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow"
                  >
                    Shop Now <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                      <Link
                        to={`/product/${item.product.slug}`}
                        onClick={closeDrawer}
                        className="shrink-0"
                      >
                        <GracefulImage
                          src={item.product.images[0] ?? ""}
                          alt={item.product.name}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div>
                          <Link
                            to={`/product/${item.product.slug}`}
                            onClick={closeDrawer}
                            className="font-body text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                          >
                            {item.product.name}
                          </Link>
                          <p className="font-body text-sm font-semibold text-primary mt-0.5">
                            ₹{item.product.price}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 rounded-full border border-border px-1 py-0.5">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="font-body text-xs font-bold text-foreground min-w-[20px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border px-5 py-4 space-y-3">
                {/* Coupon */}
                {!user ? (
                  <p className="font-body text-xs text-muted-foreground">
                    <button onClick={() => { closeDrawer(); window.dispatchEvent(new Event(OPEN_AUTH_EVENT)); }} className="text-primary font-medium hover:underline">Sign in</button> to apply a coupon code
                  </p>
                ) : (
                  <div>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Tag size={12} className="text-primary" />
                          <span className="font-body text-xs font-semibold text-primary">{appliedCoupon.code}</span>
                          <span className="font-body text-[11px] text-muted-foreground">
                            {appliedCoupon.discount_type === "percentage"
                              ? `${appliedCoupon.discount_value}% off`
                              : `₹${appliedCoupon.discount_value} off`}
                          </span>
                        </div>
                        <button onClick={removeCoupon} className="text-muted-foreground hover:text-destructive">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                          placeholder="Coupon code"
                          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-body text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="shrink-0 rounded-lg bg-secondary px-3 py-2 font-body text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                        >
                          {couponLoading ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                        </button>
                      </div>
                    )}
                    {couponError && <p className="mt-1 font-body text-[11px] text-destructive">{couponError}</p>}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-display text-lg font-bold text-foreground">₹{totalPrice.toLocaleString("en-IN")}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs text-muted-foreground">Discount</span>
                    <span className="font-body text-sm font-medium text-primary">−₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => { closeDrawer(); navigate("/cart"); }}
                    className="flex-1 rounded-full border border-border py-2.5 font-body text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    View Cart
                  </button>
                  <button
                    onClick={() => {
                      closeDrawer();
                      if (!user) {
                        window.dispatchEvent(new Event(OPEN_AUTH_EVENT));
                        return;
                      }
                      navigate("/checkout/address");
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow"
                  >
                    Checkout <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CartDrawer;
