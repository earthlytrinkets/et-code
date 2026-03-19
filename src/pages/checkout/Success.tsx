import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GracefulImage from "@/components/GracefulImage";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Package, MapPin, CreditCard, Truck, ArrowRight, ShoppingBag, Check } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Order Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_STEPS = ["confirmed", "processing", "shipped", "out_for_delivery", "delivered"];

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
const CheckoutSuccess = () => {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(slug))")
        .eq("id", orderId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center font-body text-muted-foreground">Invalid order link.</div>
        <Footer />
      </div>
    );
  }

  const currentStatusIndex = order ? STATUS_STEPS.indexOf(order.status) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 lg:px-8 max-w-3xl">
        <CheckoutStepper current={2} />

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        ) : order ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* ── Success Hero ── */}
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                className="inline-flex"
              >
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" />
                  <CheckCircle size={44} className="text-primary" strokeWidth={1.5} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h1 className="mt-5 font-display text-3xl font-bold text-foreground">
                  {order.payment_method === "cod" ? "Order Placed!" : "Payment Successful!"}
                </h1>
                <p className="mt-2 font-body text-sm text-muted-foreground max-w-sm mx-auto">
                  {order.payment_method === "cod"
                    ? "Your order is confirmed. We'll start packing it right away."
                    : "Payment received! Your order is confirmed and being prepared."}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
                  <span className="font-body text-xs text-muted-foreground">Order ID</span>
                  <span className="font-body text-xs font-bold text-foreground tracking-wider">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* ── Order Status Track ── */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">Order Status</p>
                <span className={`rounded-full px-3 py-1 font-body text-xs font-semibold ${
                  order.status === "cancelled"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                }`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>

              {order.status !== "cancelled" && (
                <div className="flex items-center gap-1">
                  {STATUS_STEPS.map((s, i) => {
                    const isDone = i <= currentStatusIndex;
                    const isCurrent = i === currentStatusIndex;
                    return (
                      <div key={s} className="flex flex-1 items-center">
                        <div className={`flex h-2 w-2 shrink-0 rounded-full transition-colors ${isDone ? "bg-primary" : "bg-border"} ${isCurrent ? "ring-2 ring-primary/30 h-3 w-3" : ""}`} />
                        {i < STATUS_STEPS.length - 1 && (
                          <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-border mx-1">
                            <div className="h-full bg-primary transition-all duration-700" style={{ width: i < currentStatusIndex ? "100%" : "0%" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Items + Total ── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <p className="font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">Items Ordered</p>
              <div className="space-y-3">
                {order.order_items.map((item: {
                  id: string; product_name: string; product_image: string | null; price: number; quantity: number;
                  products: { slug: string } | null;
                }) => {
                  const slug = item.products?.slug;
                  return (
                    <div key={item.id} className="flex items-center gap-4">
                      <Link to={slug ? `/product/${slug}` : "#"} className="h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-border bg-secondary transition-opacity hover:opacity-80">
                        <GracefulImage src={item.product_image ?? ""} alt={item.product_name} className="h-full w-full object-cover" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={slug ? `/product/${slug}` : "#"} className="hover:text-primary transition-colors">
                          <p className="font-body text-sm font-medium text-foreground truncate">{item.product_name}</p>
                        </Link>
                        <p className="font-body text-xs text-muted-foreground">Qty {item.quantity} × ₹{item.price}</p>
                      </div>
                      <span className="font-body text-sm font-semibold text-foreground">₹{item.price * item.quantity}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                {order.discount_amount > 0 && (
                  <div className="flex justify-between font-body text-sm text-muted-foreground">
                    <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
                    <span className="font-semibold text-primary">−₹{order.discount_amount}</span>
                  </div>
                )}
                <div className="flex justify-between font-body text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span className="font-medium text-primary">Free</span>
                </div>
                <div className="flex justify-between font-display text-base font-bold text-foreground">
                  <span>Total Paid</span>
                  <span>₹{order.total}</span>
                </div>
              </div>
            </div>

            {/* ── Delivery + Payment info ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} className="text-primary" />
                  <p className="font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">Delivering to</p>
                </div>
                <p className="font-body text-sm font-semibold text-foreground">{order.shipping_address.full_name}</p>
                <p className="font-body text-xs text-muted-foreground mt-0.5">{order.shipping_address.phone}</p>
                <p className="font-body text-xs text-muted-foreground mt-2 leading-relaxed">
                  {order.shipping_address.line1}
                  {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""},{" "}
                  {order.shipping_address.city}, {order.shipping_address.state} – {order.shipping_address.pincode}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  {order.payment_method === "cod" ? (
                    <Truck size={14} className="text-primary" />
                  ) : (
                    <CreditCard size={14} className="text-primary" />
                  )}
                  <p className="font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payment</p>
                </div>
                <p className="font-body text-sm font-semibold text-foreground">
                  {order.payment_method === "cod" ? "Cash on Delivery" : "Paid Online (Razorpay)"}
                </p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {order.payment_method === "cod"
                    ? "Pay when your package arrives at your door."
                    : "Payment successfully processed."}
                </p>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/shop"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-body text-sm font-semibold text-primary-foreground hover:shadow-glow transition-all"
              >
                <ShoppingBag size={16} />
                Continue Shopping
              </Link>
              <Link
                to="/profile"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border-2 border-border py-3.5 font-body text-sm font-semibold text-foreground hover:bg-secondary hover:border-primary/30 transition-all"
              >
                <Package size={16} />
                Track Order
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-24 font-body text-muted-foreground">Order not found.</div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutSuccess;
