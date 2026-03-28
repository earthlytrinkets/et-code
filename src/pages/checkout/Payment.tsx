import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CreditCard, Truck, ShieldCheck, MapPin, Check, Tag } from "lucide-react";

import GracefulImage from "@/components/GracefulImage";
import { motion, AnimatePresence } from "framer-motion";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    if (document.getElementById("razorpay-script")) { resolve(true); return; }
    const s = document.createElement("script");
    s.id = "razorpay-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

// ─── Shared Stepper ───────────────────────────────────────────────────────────
const CheckoutStepper = ({ current }: { current: 0 | 1 | 2 }) => {
  const steps = ["Address", "Payment", "Confirmation"];
  return (
    <div className="flex items-center justify-center mb-12">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                i < current
                  ? "bg-primary text-primary-foreground"
                  : i === current
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-glow"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {i < current ? <Check size={15} strokeWidth={2.5} /> : <span className="font-display">{i + 1}</span>}
            </div>
            <span
              className={`font-body text-[11px] font-medium tracking-wide ${
                i === current ? "text-primary" : i < current ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="mb-5 mx-3 h-0.5 w-16 sm:w-24 rounded-full overflow-hidden bg-border">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: i < current ? "100%" : "0%" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────
const CheckoutPayment = () => {
  const { user } = useAuth();
  const { selectedAddress, appliedCoupon, discountAmount, clearCheckout } = useCheckout();
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [method, setMethod] = useState<"cod" | "razorpay">("razorpay");
  const [placing, setPlacing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const finalTotal = totalPrice - discountAmount;

  useEffect(() => {
    if (!selectedAddress || items.length === 0) navigate("/checkout/address");
  }, [selectedAddress, items, navigate]);

  const buildOrderPayload = (paymentMethod: "cod" | "razorpay", razorpayPaymentId?: string) => ({
    user_id: user!.id,
    status: "confirmed" as const,
    subtotal: totalPrice,
    discount_amount: discountAmount,
    coupon_code: appliedCoupon?.code ?? null,
    shipping_fee: 0,
    total: finalTotal,
    payment_method: paymentMethod,
    razorpay_payment_id: razorpayPaymentId ?? null,
    shipping_address: {
      full_name: selectedAddress!.full_name,
      phone: selectedAddress!.phone,
      email: user!.email ?? "",
      line1: selectedAddress!.line1,
      line2: selectedAddress!.line2 ?? undefined,
      city: selectedAddress!.city,
      state: selectedAddress!.state,
      pincode: selectedAddress!.pincode,
    },
  });

  const createOrderItems = async (orderId: string) => {
    const orderItems = items.map((item) => ({
      order_id: orderId,
      product_id: item.product.id,
      product_name: item.product.name,
      product_image: item.product.images[0] ?? null,
      price: item.product.price,
      quantity: item.quantity,
    }));
    const { error } = await (supabase.from("order_items" as never) as any).insert(orderItems);
    if (error) console.error("order_items insert failed:", error.message);
  };

  const decrementStock = async () => {
    await Promise.all(
      items.map((item) =>
        (supabase as any).rpc("decrement_product_stock", {
          p_product_id: item.product.id,
          p_quantity: item.quantity,
        })
      )
    );
  };

  const handleCOD = async () => {
    setPlacing(true);
    setError("");
    const { data, error: err } = await supabase
      .from("orders")
      .insert(buildOrderPayload("cod"))
      .select("id")
      .single();
    if (err || !data) { setError("Failed to place order. Please try again."); setPlacing(false); return; }
    await createOrderItems(data.id);
    await decrementStock();
    supabase.functions.invoke("send-order-email", { body: { event: "order_placed", orderId: data.id } })
      .then(({ data: d, error: e }) => console.log("order_placed email response:", d, e))
      .catch((err) => console.error("order_placed email error:", err));
    clearCart();
    clearCheckout();
    navigate(`/checkout/success?orderId=${data.id}`);
  };

  const handleRazorpay = async () => {
    setPlacing(true);
    setError("");

    const loaded = await loadRazorpayScript();
    if (!loaded) { setError("Failed to load payment gateway."); setPlacing(false); return; }

    // 1. Create Razorpay order via serverless function
    let razorpayOrderId: string;
    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(finalTotal * 100) }),
      });
      if (!res.ok) throw new Error("create-order failed");
      const data = await res.json();
      razorpayOrderId = data.order_id;
    } catch {
      setError("Failed to initiate payment. Please try again.");
      setPlacing(false);
      return;
    }

    // 2. Open Razorpay popup
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: Math.round(finalTotal * 100),
      currency: "INR",
      order_id: razorpayOrderId,
      name: "Earthly Trinkets",
      description: "Order Payment",
      image: "/logo.png",
      prefill: {
        name: selectedAddress!.full_name,
        contact: selectedAddress!.phone,
        email: user!.email ?? "",
      },
      theme: { color: "#7c5c3e" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        // 3. Verify signature + save order via serverless function
        setProcessing(true);
        try {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              userId:              user!.id,
              items: items.map((i) => ({
                product_id: i.product.id,
                name:       i.product.name,
                image:      i.product.images[0] ?? null,
                price:      i.product.price,
                quantity:   i.quantity,
              })),
              shippingAddress: { ...selectedAddress, email: user!.email ?? "" },
              totalAmount:     finalTotal,
            }),
          });
          if (!verifyRes.ok) throw new Error("verify failed");
          const { orderId } = await verifyRes.json();
          await decrementStock();
          supabase.functions.invoke("send-order-email", { body: { event: "order_placed", orderId } }).catch(console.error);
          clearCart();
          clearCheckout();
          navigate(`/checkout/success?orderId=${orderId}`);
        } catch {
          setProcessing(false);
          setError("Payment received but order confirmation failed. Please contact support.");
          setPlacing(false);
        }
      },
      modal: {
        ondismiss: () => setPlacing(false),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (!selectedAddress || items.length === 0) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 lg:px-8 max-w-5xl">
        <CheckoutStepper current={1} />

        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Payment</h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">Choose how you'd like to pay</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left — payment + address */}
          <div className="lg:col-span-3 space-y-5">
            {/* Payment methods */}
            <div className="space-y-3">
              {[
                {
                  id: "razorpay" as const,
                  title: "Pay Online",
                  description: "UPI, cards, net banking & wallets",
                  badge: "Recommended",
                },
                {
                  id: "cod" as const,
                  title: "Cash on Delivery",
                  description: "Pay in cash when your order arrives",
                  badge: null,
                },
              ].map(({ id, title, description, badge }) => {
                const isSelected = method === id;
                return (
                  <motion.div
                    key={id}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => setMethod(id)}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Radio */}
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                        {isSelected && <Check size={11} strokeWidth={3} className="text-primary-foreground" />}
                      </div>

                      {/* Icon */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${isSelected ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {id === "razorpay" ? <CreditCard size={20} /> : <Truck size={20} />}
                      </div>

                      {/* Text */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-body text-sm font-semibold text-foreground">{title}</p>
                          {badge && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-body text-[10px] font-semibold text-primary">{badge}</span>
                          )}
                        </div>
                        <p className="font-body text-xs text-muted-foreground mt-0.5">{description}</p>
                        {id === "razorpay" && (
                          <div className="flex items-center gap-3 mt-2">
                            <img src="https://razorpay.com/assets/razorpay-glyph.svg" alt="Razorpay" className="h-5 opacity-70" />
                            <div className="flex gap-1.5 items-center">
                              {["UPI", "Visa", "MC", "RuPay"].map((label) => (
                                <span key={label} className="rounded bg-secondary px-1.5 py-0.5 font-body text-[9px] font-semibold text-muted-foreground">
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Delivery address summary */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-primary" />
                  <p className="font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">Delivering to</p>
                </div>
                <button
                  onClick={() => navigate("/checkout/address")}
                  className="font-body text-xs text-primary hover:underline"
                >
                  Change
                </button>
              </div>
              <p className="font-body text-sm font-semibold text-foreground">{selectedAddress.full_name}</p>
              <p className="font-body text-xs text-muted-foreground mt-0.5">{selectedAddress.phone}</p>
              <p className="font-body text-xs text-muted-foreground mt-1 leading-relaxed">
                {selectedAddress.line1}{selectedAddress.line2 ? `, ${selectedAddress.line2}` : ""},{" "}
                {selectedAddress.city}, {selectedAddress.state} – {selectedAddress.pincode}
              </p>
            </div>

            {error && (
              <p className="rounded-xl bg-destructive/10 px-4 py-3 font-body text-sm text-destructive">{error}</p>
            )}

            {/* CTA */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => navigate("/checkout/address")}
                className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={method === "cod" ? handleCOD : handleRazorpay}
                disabled={placing}
                className="inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-50"
              >
                {placing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Processing…
                  </>
                ) : (
                  <>
                    {method === "cod" ? "Place Order" : "Pay Now"}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 font-body text-xs text-muted-foreground">
              <ShieldCheck size={13} className="text-primary" />
              Secure &amp; encrypted checkout — your data is safe
            </div>
          </div>

          {/* Right — order summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl bg-card border border-border p-6 shadow-soft space-y-5">
              <h2 className="font-display text-base font-semibold text-foreground">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3 items-center">
                    <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-border">
                      <GracefulImage src={item.product.images[0] ?? ""} alt={item.product.name} className="h-full w-full object-cover" />
                      {item.quantity > 1 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary font-body text-[10px] font-bold text-primary-foreground">
                          {item.quantity}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs font-medium text-foreground truncate">{item.product.name}</p>
                      <p className="font-body text-xs text-muted-foreground">Qty {item.quantity}</p>
                    </div>
                    <span className="font-body text-sm font-semibold text-foreground">₹{item.product.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-4 space-y-2.5">
                <div className="flex justify-between font-body text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground">₹{totalPrice}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between font-body text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Tag size={12} className="text-primary" />
                      {appliedCoupon ? appliedCoupon.code : "Discount"}
                    </span>
                    <span className="font-semibold text-primary">−₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between font-body text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span className="font-medium text-primary">Free</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-display text-base font-bold text-foreground">
                  <span>Total</span>
                  <span>₹{finalTotal}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Full-screen processing overlay after Razorpay payment */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
          >
            <svg className="h-10 w-10 animate-spin text-primary mb-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="font-display text-xl font-semibold text-foreground">Confirming your order</p>
            <p className="mt-2 font-body text-sm text-muted-foreground">Payment successful — please wait…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckoutPayment;
