import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllProducts } from "@/hooks/useProducts";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { Mail, Send, RefreshCw, UserX, UserCheck, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Subscriber = {
  id: string;
  email: string;
  status: "active" | "unsubscribed";
  created_at: string;
};

type NotificationType = "new_product" | "price_drop";

// ─── Notification Modal ──────────────────────────────────────────────────────

const NotifyModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [type, setType] = useState<NotificationType>("new_product");
  const [productId, setProductId] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { data: products = [] } = useAllProducts();

  const handleSend = async () => {
    if (!productId) { toast.error("Select a product"); return; }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-newsletter", {
        body: { type, productId, customMessage: customMessage.trim() || undefined },
      });
      if (error) throw error;
      toast.success("Notification sent to all active subscribers!");
      onClose();
    } catch {
      toast.error("Failed to send notification");
    }
    setSending(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-elevated space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Send Notification</h2>
              <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
                <X size={16} />
              </button>
            </div>

            {/* Type selector */}
            <div>
              <label className="font-body text-xs font-medium text-foreground">Notification Type</label>
              <div className="mt-2 flex gap-2">
                {([
                  { id: "new_product" as const, label: "New Product" },
                  { id: "price_drop" as const, label: "Price Drop" },
                ]).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-colors ${
                      type === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product selector */}
            <div>
              <label className="font-body text-xs font-medium text-foreground">Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Rs. {p.price}
                    {p.compare_at_price ? ` (was Rs. ${p.compare_at_price})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom message */}
            <div>
              <label className="font-body text-xs font-medium text-foreground">Custom Message (optional)</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                placeholder="Add a personal note to subscribers…"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !productId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-body text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? "Sending…" : "Send to All Active Subscribers"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Subscribers Section (embeddable) ────────────────────────────────────────

export const AdminSubscribersSection = () => {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "unsubscribed">("all");
  const [notifyOpen, setNotifyOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ["admin-subscribers", statusFilter],
    queryFn: async () => {
      let query = (supabase.from("subscribers" as never) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as Subscriber[];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await (supabase.from("subscribers" as never) as any)
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscribers"] });
      toast.success("Subscriber updated");
    },
    onError: () => toast.error("Failed to update subscriber"),
  });

  const activeCount = subscribers.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Subscribers</h2>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            {activeCount} active subscriber{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setNotifyOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-body text-xs font-semibold text-primary-foreground hover:shadow-glow transition-shadow"
        >
          <Mail size={14} /> Send Notification
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "active", "unsubscribed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-4 py-1.5 font-body text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : subscribers.length === 0 ? (
        <div className="py-20 text-center font-body text-muted-foreground">No subscribers found.</div>
      ) : (
        <div className="space-y-2">
          {subscribers.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-medium text-foreground truncate">{sub.email}</p>
                <p className="font-body text-[11px] text-muted-foreground">
                  {new Date(sub.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${
                  sub.status === "active"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {sub.status === "active" ? "Active" : "Unsubscribed"}
              </span>
              <button
                onClick={() => toggleStatus.mutate({
                  id: sub.id,
                  newStatus: sub.status === "active" ? "unsubscribed" : "active",
                })}
                disabled={toggleStatus.isPending}
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
                title={sub.status === "active" ? "Unsubscribe" : "Resubscribe"}
              >
                {sub.status === "active" ? <UserX size={14} /> : <UserCheck size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <NotifyModal open={notifyOpen} onClose={() => setNotifyOpen(false)} />
    </div>
  );
};

// ─── Standalone page ──────────────────────────────────────────────────────────

const AdminSubscribers = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-10 lg:px-8">
      <AdminSubscribersSection />
    </main>
  </div>
);

export default AdminSubscribers;
