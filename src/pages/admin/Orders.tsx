import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Package } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
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
  shipping_fee: number;
  shipping_address: {
    full_name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  shiprocket_awb: string | null;
  notes: string | null;
  order_items: OrderItem[];
  profiles: { full_name: string | null; phone: string | null } | null;
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_FLOW: OrderStatus[] = [
  "pending", "confirmed", "processing", "shipped", "delivered",
];

const STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  pending:    { label: "Pending",    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  confirmed:  { label: "Confirmed",  color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  shipped:    { label: "Shipped",    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  delivered:  { label: "Delivered",  color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  refunded:   { label: "Refunded",   color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

// ─── Order Row ────────────────────────────────────────────────────────────────

const OrderRow = ({ order }: { order: Order }) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const meta = STATUS_META[order.status];
  const addr = order.shipping_address;
  const date = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header row */}
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

      {/* Expanded detail */}
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
                <p className="font-body text-xs text-muted-foreground">Shipping: ₹{order.shipping_fee}</p>
                <p className="font-body text-sm font-bold text-foreground">Total: ₹{order.total}</p>
              </div>
            </div>

            {/* Shipping + meta */}
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
                    <p className="font-body text-xs text-muted-foreground">AWB: {order.shiprocket_awb}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status update */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <span className="font-body text-sm text-muted-foreground">Move to:</span>
            {(["confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as OrderStatus[])
              .filter((s) => s !== order.status)
              .map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus.mutate(s)}
                  disabled={updateStatus.isPending}
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

// ─── Main Admin Orders Page ───────────────────────────────────────────────────

const AdminOrders = () => {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, order_items(*), profiles(full_name, phone)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
  });

  const allStatuses: (OrderStatus | "all")[] = [
    "all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 lg:px-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
          <p className="font-body text-sm text-muted-foreground">{orders.length} orders</p>
        </div>

        {/* Status filter tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
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

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
            {orders.length === 0 && (
              <div className="py-20 text-center font-body text-muted-foreground">
                No orders found.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminOrders;
