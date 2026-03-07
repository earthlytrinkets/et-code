import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Package, Truck, Send } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

type OrderItem = {
  id: string;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  created_at: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  discount_amount: number;
  coupon_code: string | null;
  shipping_fee: number;
  payment_method: "razorpay" | "cod";
  shipping_method: "personal" | "shiprocket" | null;
  shipping_address: {
    full_name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  razorpay_payment_id: string | null;
  shiprocket_order_id: string | null;
  shiprocket_awb: string | null;
  notes: string | null;
  order_items: OrderItem[];
  profiles: { full_name: string | null; phone: string | null } | null;
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  pending:          { label: "Pending",          color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  confirmed:        { label: "Confirmed",        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  processing:       { label: "Processing",       color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  shipped:          { label: "Shipped",          color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  delivered:        { label: "Delivered",        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  cancelled:        { label: "Cancelled",        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  refunded:         { label: "Refunded",         color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

// ─── Email helper ─────────────────────────────────────────────────────────────

const STATUS_EMAIL_EVENT: Partial<Record<OrderStatus, string>> = {
  confirmed:        "order_confirmed",
  shipped:          "order_shipped",
  out_for_delivery: "order_out_for_delivery",
  delivered:        "order_delivered",
};

const sendStatusEmail = (orderId: string, status: OrderStatus) => {
  const event = STATUS_EMAIL_EVENT[status];
  if (!event) return;
  supabase.functions.invoke("send-order-email", { body: { event, orderId } }).catch(console.error);
};

// ─── Shiprocket helpers ───────────────────────────────────────────────────────

const SR_TOKEN_KEY = "et_shiprocket_token";

const callShiprocket = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("shiprocket", { body });
  if (error) throw new Error(error.message);
  return data;
};

// ─── Order Row ────────────────────────────────────────────────────────────────

const OrderRow = ({ order }: { order: Order }) => {
  const [open, setOpen] = useState(false);
  const [shipMode, setShipMode] = useState<"personal" | "shiprocket">("personal");
  const [trackingInput, setTrackingInput] = useState(order.shiprocket_awb ?? "");
  const [srEmail, setSrEmail] = useState("");
  const [srPassword, setSrPassword] = useState("");
  const [srToken, setSrToken] = useState<string | null>(() => localStorage.getItem(SR_TOKEN_KEY));
  const [srLoading, setSrLoading] = useState(false);
  const queryClient = useQueryClient();

  const updateOrder = useMutation({
    mutationFn: async (patch: Partial<Order>) => {
      const { error } = await supabase.from("orders").update(patch as never).eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: (_, patch) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order updated");
      const newStatus = (patch as Partial<Order>).status;
      if (newStatus) sendStatusEmail(order.id, newStatus);
    },
    onError: () => toast.error("Failed to update order"),
  });

  const handlePersonalShip = async () => {
    if (!trackingInput.trim()) return;
    const alreadyShipped = order.shiprocket_awb != null;
    await updateOrder.mutateAsync({
      ...(alreadyShipped ? {} : { status: "shipped" }),
      shipping_method: "personal",
      shiprocket_awb: trackingInput.trim(),
    } as never);
  };

  const handleSrLogin = async () => {
    if (!srEmail || !srPassword) return;
    setSrLoading(true);
    try {
      const res = await callShiprocket({ action: "login", email: srEmail, password: srPassword });
      if (res?.token) {
        localStorage.setItem(SR_TOKEN_KEY, res.token);
        setSrToken(res.token);
        toast.success("Connected to Shiprocket");
      } else {
        toast.error("Invalid Shiprocket credentials");
      }
    } catch { toast.error("Shiprocket login failed"); }
    setSrLoading(false);
  };

  const handleSrShip = async () => {
    if (!srToken) return;
    setSrLoading(true);
    const addr = order.shipping_address;
    try {
      // 1. Create Shiprocket order
      const srOrder = await callShiprocket({
        action: "create_order",
        token: srToken,
        order: {
          order_id: order.id.slice(0, 20),
          order_date: new Date().toISOString().slice(0, 10),
          pickup_location: "Primary",
          billing_customer_name: addr.full_name,
          billing_last_name: "",
          billing_address: addr.line1,
          billing_address_2: addr.line2 ?? "",
          billing_city: addr.city,
          billing_state: addr.state,
          billing_pincode: addr.pincode,
          billing_country: "India",
          billing_phone: addr.phone,
          billing_email: order.profiles?.full_name ?? "customer@example.com",
          shipping_is_billing: true,
          order_items: order.order_items.map((i) => ({
            name: i.product_name,
            sku: i.id.slice(0, 8),
            units: i.quantity,
            selling_price: i.price,
          })),
          payment_method: order.payment_method === "cod" ? "COD" : "Prepaid",
          sub_total: order.subtotal,
          length: 15, breadth: 15, height: 10, weight: 0.5,
        },
      });

      if (!srOrder?.shipment_id) { toast.error("Shiprocket order creation failed"); setSrLoading(false); return; }

      // 2. Assign AWB
      const awbRes = await callShiprocket({
        action: "assign_awb",
        token: srToken,
        shipment_id: srOrder.shipment_id,
      });

      const awb = awbRes?.awb_assign_status_message === "AWB Assigned" ? awbRes?.response?.data?.awb_code : null;

      await updateOrder.mutateAsync({
        status: "shipped",
        shipping_method: "shiprocket",
        shiprocket_order_id: String(srOrder.order_id),
        shiprocket_awb: awb ?? String(srOrder.shipment_id),
      } as never);

      toast.success(`Shipment created${awb ? ` · AWB: ${awb}` : ""}`);
    } catch (e) { toast.error(`Shiprocket error: ${String(e)}`); }
    setSrLoading(false);
  };

  const meta = STATUS_META[order.status];
  const addr = order.shipping_address;
  const date = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  const showShipping = ["confirmed", "processing", "shipped", "out_for_delivery"].includes(order.status);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/30"
      >
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
          <div>
            <p className="font-body text-xs text-muted-foreground">Order</p>
            <p className="font-body text-sm font-medium text-foreground truncate">#{order.id.slice(0, 8)}</p>
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground">Customer</p>
            <p className="font-body text-sm text-foreground">{order.profiles?.full_name ?? addr.full_name}</p>
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground">Date</p>
            <p className="font-body text-sm text-foreground">{date}</p>
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground">Total</p>
            <p className="font-body text-sm font-semibold text-foreground">₹{order.total}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${meta.color}`}>
          {meta.label}
        </span>
        {open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-5 space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Items */}
            <div className="sm:col-span-2 space-y-3">
              <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</h3>
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.product_image ? (
                    <img src={item.product_image} alt="" className="h-10 w-10 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Package size={14} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-foreground truncate">{item.product_name}</p>
                    <p className="font-body text-xs text-muted-foreground">Qty {item.quantity} × ₹{item.price}</p>
                  </div>
                  <p className="font-body text-sm font-semibold text-foreground">₹{item.price * item.quantity}</p>
                </div>
              ))}
              <div className="border-t border-border pt-2 space-y-1 text-right">
                <p className="font-body text-xs text-muted-foreground">Subtotal: ₹{order.subtotal}</p>
                {order.discount_amount > 0 && (
                  <p className="font-body text-xs text-primary">Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}: −₹{order.discount_amount}</p>
                )}
                <p className="font-body text-xs text-muted-foreground capitalize">
                  Payment: {order.payment_method === "cod" ? "Cash on Delivery" : "Online (Razorpay)"}
                </p>
                <p className="font-body text-sm font-bold text-foreground">Total: ₹{order.total}</p>
              </div>
            </div>

            {/* Address & refs */}
            <div className="space-y-4">
              <div>
                <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Ship to</h3>
                <p className="font-body text-sm text-foreground">{addr.full_name}</p>
                <p className="font-body text-sm text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                <p className="font-body text-sm text-muted-foreground">{addr.city}, {addr.state} — {addr.pincode}</p>
                <p className="font-body text-sm text-muted-foreground">{addr.phone}</p>
              </div>
              {(order.razorpay_payment_id || order.shiprocket_awb) && (
                <div>
                  <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Reference</h3>
                  {order.razorpay_payment_id && (
                    <p className="font-body text-xs text-muted-foreground">Payment: {order.razorpay_payment_id}</p>
                  )}
                  {order.shiprocket_awb && (
                    <p className="font-body text-xs text-muted-foreground">
                      AWB / Tracking: <span className="font-semibold text-foreground">{order.shiprocket_awb}</span>
                    </p>
                  )}
                  {order.shipping_method && (
                    <p className="font-body text-xs text-muted-foreground capitalize">Via: {order.shipping_method === "shiprocket" ? "Shiprocket" : "Personal Courier"}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Arrange Shipping ── */}
          {showShipping && (
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-primary" />
                <h3 className="font-body text-sm font-semibold text-foreground">Arrange Shipping</h3>
              </div>

              {/* Mode selector */}
              <div className="flex gap-2">
                {(["personal", "shiprocket"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setShipMode(m)}
                    className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-colors ${
                      shipMode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "personal" ? "Personal Courier" : "Shiprocket"}
                  </button>
                ))}
              </div>

              {shipMode === "personal" ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="Enter tracking / AWB number"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={handlePersonalShip}
                    disabled={!trackingInput.trim() || updateOrder.isPending}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-body text-xs font-semibold text-primary-foreground disabled:opacity-50 shrink-0"
                  >
                    <Send size={12} /> {order.shiprocket_awb ? "Update Tracking" : "Mark Shipped"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {!srToken ? (
                    <>
                      <p className="font-body text-xs text-muted-foreground">Enter your Shiprocket credentials to connect</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="email"
                          value={srEmail}
                          onChange={(e) => setSrEmail(e.target.value)}
                          placeholder="Shiprocket email"
                          className="rounded-lg border border-border bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                        />
                        <input
                          type="password"
                          value={srPassword}
                          onChange={(e) => setSrPassword(e.target.value)}
                          placeholder="Shiprocket password"
                          className="rounded-lg border border-border bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <button
                        onClick={handleSrLogin}
                        disabled={srLoading || !srEmail || !srPassword}
                        className="rounded-lg bg-secondary px-4 py-2 font-body text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50"
                      >
                        {srLoading ? "Connecting…" : "Connect Shiprocket"}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="font-body text-xs text-primary font-medium">✓ Shiprocket connected</p>
                      <button
                        onClick={handleSrShip}
                        disabled={srLoading || updateOrder.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-body text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        <Truck size={12} /> {srLoading ? "Creating…" : "Create Shipment"}
                      </button>
                      <button
                        onClick={() => { localStorage.removeItem(SR_TOKEN_KEY); setSrToken(null); }}
                        className="font-body text-xs text-muted-foreground hover:text-destructive"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status transitions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <span className="font-body text-sm text-muted-foreground">Move to:</span>
            {(["confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"] as OrderStatus[])
              .filter((s) => s !== order.status)
              .map((s) => (
                <button
                  key={s}
                  onClick={() => updateOrder.mutate({ status: s } as never)}
                  disabled={updateOrder.isPending}
                  className={`rounded-full px-3 py-1.5 font-body text-xs font-medium transition-colors disabled:opacity-50 ${STATUS_META[s].color} hover:opacity-80`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Orders Section (embeddable) ─────────────────────────────────────────────

export const AdminOrdersSection = () => {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
  });

  const allStatuses: (OrderStatus | "all")[] = [
    "all", "pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded",
  ];

  return (
    <div className="space-y-5">
      <div className="mb-1">
        <h2 className="font-display text-xl font-bold text-foreground">Orders</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {allStatuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-4 py-1.5 font-body text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : STATUS_META[s].label}
          </button>
        ))}
      </div>

      {ordersLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => <OrderRow key={order.id} order={order} />)}
          {orders.length === 0 && (
            <div className="py-20 text-center font-body text-muted-foreground">No orders found.</div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Standalone page ──────────────────────────────────────────────────────────

const AdminOrders = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-10 lg:px-8">
      <AdminOrdersSection />
    </main>
  </div>
);

export default AdminOrders;
