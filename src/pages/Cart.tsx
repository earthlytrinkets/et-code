import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import GracefulImage from "@/components/GracefulImage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { Minus, Plus, X, ShoppingBag, ArrowRight, Tag, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Coupon {
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  min_order_value: number;
}

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();
  const { user } = useAuth();
  const { setCoupon } = useCheckout();
  const { isAdmin, roleChecked } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (roleChecked && isAdmin) navigate("/shop", { replace: true });
  }, [isAdmin, roleChecked, navigate]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const discountAmount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? Math.round((totalPrice * appliedCoupon.discount_value) / 100)
      : Math.min(appliedCoupon.discount_value, totalPrice)
    : 0;
  const finalTotal = totalPrice - discountAmount;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponError("");
    setCouponLoading(true);

    const { data, error } = await supabase
      .from("coupons" as never)
      .select("code, discount_type, discount_value, min_order_value, max_uses, uses_count, expires_at")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle() as { data: (Coupon & { max_uses: number | null; uses_count: number; expires_at: string | null }) | null; error: unknown };

    setCouponLoading(false);

    if (error || !data) { setCouponError("Invalid or expired coupon code."); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setCouponError("This coupon has expired."); return; }
    if (data.max_uses !== null && data.uses_count >= data.max_uses) { setCouponError("This coupon has reached its usage limit."); return; }
    if (totalPrice < data.min_order_value) { setCouponError(`Minimum order of ₹${data.min_order_value} required.`); return; }

    setAppliedCoupon({ code: data.code, discount_type: data.discount_type, discount_value: data.discount_value, min_order_value: data.min_order_value });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <ShoppingBag size={48} className="text-muted-foreground/30" />
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Your cart is empty</h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">Discover our handcrafted pieces</p>
          <Link
            to="/shop"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-body text-sm font-semibold text-primary-foreground"
          >
            Shop Now <ArrowRight size={14} />
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-12 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Cart ({totalItems})</h1>

        <div className="mt-8 grid gap-12 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <motion.div
                key={item.product.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-4 rounded-xl bg-card p-4 shadow-soft"
              >
                <Link to={`/product/${item.product.slug}`}>
                  <GracefulImage
                    src={item.product.images[0] ?? ""}
                    alt={item.product.name}
                    className="h-24 w-24 rounded-lg object-cover transition-opacity hover:opacity-80"
                  />
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link to={`/product/${item.product.slug}`} className="hover:text-primary transition-colors">
                        <h3 className="font-display text-sm font-semibold text-foreground">{item.product.name}</h3>
                      </Link>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-destructive">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full bg-secondary">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="rounded-full p-2 text-muted-foreground hover:text-foreground"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-body text-sm font-medium text-foreground w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="rounded-full p-2 text-muted-foreground hover:text-foreground"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="font-body text-sm font-semibold text-foreground">₹{item.product.price * item.quantity}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-xl bg-card p-6 shadow-soft h-fit space-y-6">
            {/* Coupon */}
            <div>
              <p className="font-body text-sm font-medium text-foreground mb-2">Have a coupon?</p>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-primary" />
                    <span className="font-body text-sm font-semibold text-primary">{appliedCoupon.code}</span>
                    <span className="font-body text-xs text-muted-foreground">
                      {appliedCoupon.discount_type === "percentage"
                        ? `${appliedCoupon.discount_value}% off`
                        : `₹${appliedCoupon.discount_value} off`}
                    </span>
                  </div>
                  <button onClick={removeCoupon} className="text-muted-foreground hover:text-destructive">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    placeholder="Enter code"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="rounded-lg bg-secondary px-4 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                  >
                    {couponLoading ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                  </button>
                </div>
              )}
              {couponError && <p className="mt-1.5 font-body text-xs text-destructive">{couponError}</p>}
            </div>

            {/* Order Summary */}
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Order Summary</h2>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between font-body text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">₹{totalPrice}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-primary font-medium">−₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between font-body text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-primary font-medium">Free</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-body text-base font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">₹{finalTotal}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!user) { setAuthModalOpen(true); return; }
                setCoupon(appliedCoupon, discountAmount);
                navigate("/checkout/address");
              }}
              className="w-full rounded-full bg-primary py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow"
            >
              Proceed to Checkout
            </button>
            {!user && (
              <p className="text-center font-body text-xs text-muted-foreground">
                You'll need to sign in to place an order
              </p>
            )}
            {user && (
              <p className="text-center font-body text-xs text-muted-foreground">
                Secure checkout powered by Razorpay
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default Cart;
