import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Ticket, X } from "lucide-react";

type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "flat";
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  uses_count: number;
  is_active: boolean;
  first_order_only: boolean;
  starts_at: string | null;
  expires_at: string | null;
  max_discount_amount: number | null;
  created_at: string;
};

type CouponForm = {
  code: string;
  description: string;
  discount_type: "percentage" | "flat";
  discount_value: string;
  min_order_value: string;
  max_uses: string;
  max_uses_per_user: string;
  max_discount_amount: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  first_order_only: boolean;
};

const emptyForm: CouponForm = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_value: "0",
  max_uses: "",
  max_uses_per_user: "",
  max_discount_amount: "",
  starts_at: "",
  expires_at: "",
  is_active: true,
  first_order_only: false,
};

const toLocalInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

const toIsoOrNull = (value: string) => {
  if (!value.trim()) return null;
  return new Date(value).toISOString();
};

const CouponModal = ({
  initial,
  onClose,
}: {
  initial?: CouponRow;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CouponForm>(
    initial
      ? {
          code: initial.code,
          description: initial.description ?? "",
          discount_type: initial.discount_type,
          discount_value: String(initial.discount_value),
          min_order_value: String(initial.min_order_value),
          max_uses: initial.max_uses === null ? "" : String(initial.max_uses),
          max_uses_per_user: initial.max_uses_per_user === null ? "" : String(initial.max_uses_per_user),
          max_discount_amount: initial.max_discount_amount === null ? "" : String(initial.max_discount_amount),
          starts_at: toLocalInput(initial.starts_at),
          expires_at: toLocalInput(initial.expires_at),
          is_active: initial.is_active,
          first_order_only: initial.first_order_only,
        }
      : emptyForm
  );

  const set = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const validationError = useMemo(() => {
    if (!form.code.trim()) return "Coupon code is required.";
    if (!/^[A-Z0-9_-]+$/.test(form.code.trim().toUpperCase())) {
      return "Use only letters, numbers, hyphens, or underscores in the code.";
    }
    const discountValue = Number(form.discount_value);
    if (!Number.isFinite(discountValue) || discountValue <= 0) return "Discount value must be greater than 0.";
    if (form.discount_type === "percentage" && discountValue > 100) return "Percentage discount cannot exceed 100.";
    if (Number(form.min_order_value) < 0) return "Minimum order value cannot be negative.";
    if (form.max_uses && Number(form.max_uses) <= 0) return "Maximum uses must be greater than 0.";
    if (form.max_uses_per_user && Number(form.max_uses_per_user) <= 0) return "Per-user limit must be greater than 0.";
    if (form.max_discount_amount && Number(form.max_discount_amount) <= 0) return "Discount cap must be greater than 0.";
    if (form.starts_at && form.expires_at && new Date(form.starts_at) >= new Date(form.expires_at)) {
      return "Expiry must be later than the start date.";
    }
    return "";
  }, [form]);

  const save = useMutation({
    mutationFn: async () => {
      if (validationError) throw new Error(validationError);

      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_value: Number(form.min_order_value || "0"),
        max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
        max_uses_per_user: form.max_uses_per_user.trim() ? Number(form.max_uses_per_user) : null,
        max_discount_amount:
          form.discount_type === "percentage" && form.max_discount_amount.trim()
            ? Number(form.max_discount_amount)
            : null,
        starts_at: toIsoOrNull(form.starts_at),
        expires_at: toIsoOrNull(form.expires_at),
        is_active: form.is_active,
        first_order_only: form.first_order_only,
      };

      if (initial) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success(initial ? "Coupon updated" : "Coupon created");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-card p-6 shadow-elevated">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">
            {initial ? "Edit Coupon" : "Create Coupon"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Coupon Code *</Label>
            <Input
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="WELCOME10"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <div className="flex h-10 items-center gap-4 rounded-md border border-input bg-background px-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.first_order_only}
                  onChange={(e) => set("first_order_only", e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                First order only
              </label>
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Optional internal/admin description for this coupon"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Discount Type</Label>
            <select
              value={form.discount_type}
              onChange={(e) => set("discount_type", e.target.value as CouponForm["discount_type"])}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="percentage">Percentage</option>
              <option value="flat">Flat amount</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>{form.discount_type === "percentage" ? "Discount (%)" : "Discount (₹)"}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.discount_value}
              onChange={(e) => set("discount_value", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Minimum Order Value (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.min_order_value}
              onChange={(e) => set("min_order_value", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Discount Cap (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.max_discount_amount}
              onChange={(e) => set("max_discount_amount", e.target.value)}
              placeholder={form.discount_type === "percentage" ? "Optional" : "Only used for percentage coupons"}
              disabled={form.discount_type !== "percentage"}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Total Usage Limit</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={form.max_uses}
              onChange={(e) => set("max_uses", e.target.value)}
              placeholder="Leave blank for unlimited"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Per-user Usage Limit</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={form.max_uses_per_user}
              onChange={(e) => set("max_uses_per_user", e.target.value)}
              placeholder="Leave blank for unlimited"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Starts At</Label>
            <Input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => set("starts_at", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Expires At</Label>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => set("expires_at", e.target.value)}
            />
          </div>
        </div>

        {validationError && (
          <p className="mt-4 font-body text-xs text-destructive">{validationError}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !!validationError}>
            {save.isPending ? "Saving..." : initial ? "Update Coupon" : "Create Coupon"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const AdminCouponsSection = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CouponRow | "new" | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CouponRow[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const now = Date.now();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Coupons</h2>
          <p className="font-body text-sm text-muted-foreground">
            Create, expire, disable, and monitor discount codes safely.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus size={14} className="mr-1.5" /> Add Coupon
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <Ticket size={28} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 font-body text-sm text-muted-foreground">No coupons created yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const isExpired = !!coupon.expires_at && new Date(coupon.expires_at).getTime() <= now;
            const isScheduled = !!coupon.starts_at && new Date(coupon.starts_at).getTime() > now;
            const remainingUses = coupon.max_uses === null ? "Unlimited" : Math.max(coupon.max_uses - coupon.uses_count, 0);

            return (
              <div key={coupon.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-semibold text-foreground">{coupon.code}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${
                          !coupon.is_active
                            ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            : isExpired
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : isScheduled
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {!coupon.is_active ? "Inactive" : isExpired ? "Expired" : isScheduled ? "Scheduled" : "Active"}
                      </span>
                      {coupon.first_order_only && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-body text-[11px] font-semibold text-primary">
                          First order only
                        </span>
                      )}
                    </div>

                    {coupon.description && (
                      <p className="mt-2 font-body text-sm text-muted-foreground">{coupon.description}</p>
                    )}

                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                      <p>
                        Discount:{" "}
                        <span className="font-semibold text-foreground">
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}%`
                            : `₹${coupon.discount_value}`}
                        </span>
                      </p>
                      <p>
                        Minimum order: <span className="font-semibold text-foreground">₹{coupon.min_order_value}</span>
                      </p>
                      <p>
                        Total uses: <span className="font-semibold text-foreground">{coupon.uses_count}</span>
                        {coupon.max_uses !== null ? ` / ${coupon.max_uses}` : " / unlimited"}
                      </p>
                      <p>
                        Remaining: <span className="font-semibold text-foreground">{remainingUses}</span>
                      </p>
                      <p>
                        Per-user limit:{" "}
                        <span className="font-semibold text-foreground">
                          {coupon.max_uses_per_user ?? "Unlimited"}
                        </span>
                      </p>
                      <p>
                        Starts:{" "}
                        <span className="font-semibold text-foreground">
                          {coupon.starts_at ? new Date(coupon.starts_at).toLocaleString("en-IN") : "Immediately"}
                        </span>
                      </p>
                      <p>
                        Expires:{" "}
                        <span className="font-semibold text-foreground">
                          {coupon.expires_at ? new Date(coupon.expires_at).toLocaleString("en-IN") : "Never"}
                        </span>
                      </p>
                      <p>
                        Max discount:{" "}
                        <span className="font-semibold text-foreground">
                          {coupon.max_discount_amount === null ? "No cap" : `₹${coupon.max_discount_amount}`}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setEditing(coupon)}
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      title="Edit coupon"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete coupon "${coupon.code}"?`)) {
                          remove.mutate(coupon.id);
                        }
                      }}
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Delete coupon"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing !== null && (
        <CouponModal
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

const AdminCoupons = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-10 lg:px-8">
      <AdminCouponsSection />
    </main>
  </div>
);

export default AdminCoupons;

