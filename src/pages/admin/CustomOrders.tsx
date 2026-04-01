import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, ImageIcon, ExternalLink } from "lucide-react";

type CustomOrderStatus = "new" | "reviewed" | "contacted" | "closed";

type CustomOrder = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  description: string;
  budget_range: string | null;
  reference_images: string[];
  status: CustomOrderStatus;
  user_id: string | null;
};

const STATUS_META: Record<CustomOrderStatus, { label: string; color: string }> = {
  new:       { label: "New",       color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  reviewed:  { label: "Reviewed",  color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  contacted: { label: "Contacted", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  closed:    { label: "Closed",    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
};

const CustomOrderRow = ({ order }: { order: CustomOrder }) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async (status: CustomOrderStatus) => {
      const { error } = await supabase
        .from("custom_orders")
        .update({ status })
        .eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-custom-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-new-custom-order-count"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const meta = STATUS_META[order.status];
  const date = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/30"
      >
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
          <div>
            <p className="font-body text-xs text-muted-foreground">Name</p>
            <p className="font-body text-sm font-medium text-foreground truncate">{order.name}</p>
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground">Email</p>
            <p className="font-body text-sm text-foreground truncate">{order.email}</p>
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground">Date</p>
            <p className="font-body text-sm text-foreground">{date}</p>
          </div>
          <div>
            <p className="font-body text-xs text-muted-foreground">Budget</p>
            <p className="font-body text-sm text-foreground">{order.budget_range ?? "Not specified"}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${meta.color}`}>
          {meta.label}
        </span>
        {open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-5 space-y-5">
          {/* Description */}
          <div>
            <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Description</h3>
            <p className="font-body text-sm text-foreground whitespace-pre-wrap">{order.description}</p>
          </div>

          {/* Reference images */}
          {order.reference_images.length > 0 && (
            <div>
              <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Reference Images ({order.reference_images.length})
              </h3>
              <div className="flex flex-wrap gap-3">
                {order.reference_images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group relative h-24 w-24 overflow-hidden rounded-lg border border-border">
                    <img src={url} alt={`Reference ${i + 1}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <ExternalLink size={16} className="text-white" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Contact info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Contact</h3>
              <p className="font-body text-sm text-foreground">{order.name}</p>
              <a href={`mailto:${order.email}`} className="font-body text-sm text-primary hover:underline">{order.email}</a>
            </div>
            {order.user_id && (
              <div>
                <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Account</h3>
                <p className="font-body text-xs text-muted-foreground">Registered user</p>
              </div>
            )}
          </div>

          {/* Status transitions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <span className="font-body text-sm text-muted-foreground">Move to:</span>
            {(["new", "reviewed", "contacted", "closed"] as CustomOrderStatus[])
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

// ─── Custom Orders Section (embeddable in Profile) ──────────────────────────

export const AdminCustomOrdersSection = () => {
  const [statusFilter, setStatusFilter] = useState<CustomOrderStatus | "all">("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-custom-orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("custom_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as CustomOrder[];
    },
  });

  const allStatuses: (CustomOrderStatus | "all")[] = ["all", "new", "reviewed", "contacted", "closed"];

  return (
    <div className="space-y-5">
      <div className="mb-1">
        <h2 className="font-display text-xl font-bold text-foreground">Custom Order Enquiries</h2>
        <p className="mt-1 font-body text-sm text-muted-foreground">Manage custom order enquiries from customers</p>
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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-card px-5 py-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <div className="h-2.5 w-10 rounded bg-secondary" />
                  <div className="h-3.5 w-24 rounded bg-secondary" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2.5 w-14 rounded bg-secondary" />
                  <div className="h-3.5 w-20 rounded bg-secondary" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2.5 w-8 rounded bg-secondary" />
                  <div className="h-3.5 w-16 rounded bg-secondary" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2.5 w-10 rounded bg-secondary" />
                  <div className="h-5 w-20 rounded-full bg-secondary" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => <CustomOrderRow key={order.id} order={order} />)}
          {orders.length === 0 && (
            <div className="py-20 text-center font-body text-muted-foreground">No custom order enquiries found.</div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Standalone page ────────────────────────────────────────────────────────

const AdminCustomOrders = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-10 lg:px-8">
      <AdminCustomOrdersSection />
    </main>
  </div>
);

export default AdminCustomOrders;
