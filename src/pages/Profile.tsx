import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AdminProductsSection } from "@/pages/admin/Products";
import { AdminOrdersSection } from "@/pages/admin/Orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  MapPin,
  ShoppingBag,
  Plus,
  Pencil,
  Trash2,
  Check,
  Star,
  ChevronRight,
  Camera,
  Loader2,
  Package,
  LayoutDashboard,
  Truck,
  MapPinned,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// ─── Types ───────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
};

type Address = {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};

type AddressFormData = Omit<Address, "id" | "user_id">;

const emptyAddressForm: AddressFormData = {
  label: "Home",
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  is_default: false,
};

type Section = "profile" | "addresses" | "orders" | "admin-products" | "admin-orders";

// ─── Sidebar nav items ────────────────────────────────────────────────────────

const navItems: { id: Section; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: "profile",
    label: "My Profile",
    icon: User,
    description: "Name, email & phone",
  },
  {
    id: "addresses",
    label: "Saved Addresses",
    icon: MapPin,
    description: "Delivery addresses",
  },
  {
    id: "orders",
    label: "My Orders",
    icon: ShoppingBag,
    description: "Order history & tracking",
  },
];

// ─── Profile Tab ─────────────────────────────────────────────────────────────

const ProfileSection = ({
  profile,
  email,
  oauthName,
  onSave,
  saving,
  onAvatarClick,
  onAvatarChange,
  avatarInputRef,
  avatarUploading,
}: {
  profile: Profile | undefined;
  email: string | undefined;
  oauthName?: string;
  onSave: (data: { full_name: string; phone: string }) => void;
  saving: boolean;
  onAvatarClick: () => void;
  onAvatarChange: (file: File) => void;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  avatarUploading: boolean;
}) => {
  const [name, setName] = useState(profile?.full_name || oauthName || "");
  const [phone, setPhone] = useState(profile?.phone ?? "");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">My Profile</h2>
        <p className="font-body text-sm text-muted-foreground mt-1">
          Update your personal information.
        </p>
      </div>

      {/* Avatar + name header */}
      <div className="flex items-center gap-4 rounded-2xl bg-secondary/40 p-4">
        <button
          type="button"
          onClick={onAvatarClick}
          disabled={avatarUploading}
          className="relative shrink-0 group"
          title="Change profile photo"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20"
              onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.removeAttribute("style"); }}
            />
          ) : null}
          <div
            style={profile?.avatar_url ? { display: "none" } : undefined}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary ring-2 ring-primary/20"
          >
            <User size={24} className="text-muted-foreground" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {avatarUploading
              ? <Loader2 size={16} className="animate-spin text-white" />
              : <Camera size={16} className="text-white" />}
          </div>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarChange(f); e.target.value = ""; }}
        />
        <div>
          <p className="font-body font-semibold text-foreground">
            {profile?.full_name || oauthName || "Your Name"}
          </p>
          <p className="font-body text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="max-w-md space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={email ?? ""}
            disabled
            className="bg-muted/50 text-muted-foreground"
          />
          <p className="font-body text-xs text-muted-foreground">
            Email is managed by your sign-in provider and cannot be changed here.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <Button onClick={() => onSave({ full_name: name, phone })} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

// ─── Address Form ─────────────────────────────────────────────────────────────

const AddressForm = ({
  initial,
  userId,
  onSuccess,
  onCancel,
}: {
  initial?: Address;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState<AddressFormData>(
    initial
      ? {
          label: initial.label,
          full_name: initial.full_name,
          phone: initial.phone,
          line1: initial.line1,
          line2: initial.line2 ?? "",
          city: initial.city,
          state: initial.state,
          pincode: initial.pincode,
          is_default: initial.is_default,
        }
      : emptyAddressForm
  );
  const [saving, setSaving] = useState(false);

  const set = (key: keyof AddressFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.full_name || !form.phone || !form.line1 || !form.city || !form.state || !form.pincode) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        const { error } = await supabase
          .from("addresses")
          .update({ ...form, country: "India" })
          .eq("id", initial.id);
        if (error) throw error;
        toast.success("Address updated");
      } else {
        const { error } = await supabase
          .from("addresses")
          .insert({ ...form, user_id: userId, country: "India" });
        if (error) throw error;
        toast.success("Address saved");
      }
      onSuccess();
    } catch {
      toast.error("Failed to save address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="font-display text-base">
          {initial ? "Edit Address" : "Add New Address"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Label selector */}
        <div className="space-y-1.5">
          <Label>Label</Label>
          <div className="flex gap-2">
            {["Home", "Work", "Other"].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => set("label", l)}
                className={`rounded-full px-4 py-1.5 font-body text-xs font-medium transition-colors ${
                  form.label === l
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="addr-name">Full Name *</Label>
            <Input
              id="addr-name"
              placeholder="Recipient's name"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-phone">Phone *</Label>
            <Input
              id="addr-phone"
              placeholder="10-digit mobile number"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="addr-line1">Address Line 1 *</Label>
          <Input
            id="addr-line1"
            placeholder="House / Flat / Building, Street"
            value={form.line1}
            onChange={(e) => set("line1", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="addr-line2">Address Line 2 (optional)</Label>
          <Input
            id="addr-line2"
            placeholder="Area / Colony / Locality"
            value={form.line2 ?? ""}
            onChange={(e) => set("line2", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="addr-city">City *</Label>
            <Input
              id="addr-city"
              placeholder="City"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-state">State *</Label>
            <Input
              id="addr-state"
              placeholder="State"
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr-pincode">Pincode *</Label>
            <Input
              id="addr-pincode"
              placeholder="6-digit"
              maxLength={6}
              value={form.pincode}
              onChange={(e) => set("pincode", e.target.value)}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 font-body text-sm">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => set("is_default", e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Set as default delivery address
        </label>

        <div className="flex gap-3 pt-1">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : initial ? "Update Address" : "Save Address"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Addresses Section ────────────────────────────────────────────────────────

const AddressesSection = ({
  addresses,
  userId,
  onRefresh,
}: {
  addresses: Address[];
  userId: string;
  onRefresh: () => void;
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete address");
    } else {
      toast.success("Address removed");
      onRefresh();
    }
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    if (error) {
      toast.error("Failed to update default");
    } else {
      onRefresh();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Saved Addresses</h2>
          <p className="font-body text-sm text-muted-foreground mt-1">
            Manage your delivery addresses.
          </p>
        </div>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1.5 shrink-0">
            <Plus size={13} /> Add Address
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <AddressForm
          userId={userId}
          onSuccess={() => { setShowForm(false); onRefresh(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Empty state */}
      {addresses.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
          <MapPin size={30} className="text-muted-foreground/40" />
          <p className="font-body text-sm text-muted-foreground">No saved addresses yet.</p>
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={13} className="mr-1" /> Add Your First Address
          </Button>
        </div>
      )}

      {/* Address cards */}
      <div className="space-y-3">
        {addresses.map((addr) =>
          editingId === addr.id ? (
            <AddressForm
              key={addr.id}
              initial={addr}
              userId={userId}
              onSuccess={() => { setEditingId(null); onRefresh(); }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <Card key={addr.id} className={addr.is_default ? "border-primary/40" : ""}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 font-body text-xs font-medium">
                        {addr.label}
                      </span>
                      {addr.is_default && (
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 font-body text-xs font-medium text-primary">
                          <Check size={10} /> Default
                        </span>
                      )}
                    </div>
                    <p className="font-body font-semibold text-foreground">{addr.full_name}</p>
                    <p className="font-body text-sm text-muted-foreground">
                      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}
                    </p>
                    <p className="font-body text-sm text-muted-foreground">
                      {addr.city}, {addr.state} — {addr.pincode}
                    </p>
                    <p className="font-body text-sm text-muted-foreground">{addr.phone}</p>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        title="Set as default"
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <Star size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingId(addr.id)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
};

// ─── Shiprocket Live Tracking ─────────────────────────────────────────────────

type TrackingActivity = {
  date: string;
  activity: string;
  location: string;
  sr_status: string;
};

type TrackingData = {
  tracking_data?: {
    track_status: number;
    shipment_status: number;
    shipment_track: { current_status: string; delivered_date?: string; edd?: string }[];
    shipment_track_activities: TrackingActivity[];
    error?: string;
  };
  // Shiprocket may nest differently
  [key: string]: unknown;
};

const ShiprocketTracker = ({ awb, shippingMethod }: { awb: string; shippingMethod: string | null }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = async () => {
    if (shippingMethod !== "shiprocket") {
      // For personal couriers, we can't fetch live tracking
      setOpen(!open);
      return;
    }
    if (tracking) { setOpen(!open); return; }

    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("shiprocket", {
        body: { action: "track", awb },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.tracking_data?.error) throw new Error(data.tracking_data.error);
      setTracking(data);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  };

  const track = tracking?.tracking_data;
  const currentStatus = track?.shipment_track?.[0]?.current_status;
  const edd = track?.shipment_track?.[0]?.edd;
  const activities = track?.shipment_track_activities ?? [];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <Truck size={12} className="text-primary" />
        <span className="font-body text-xs text-muted-foreground">AWB:</span>
        <span className="font-body text-xs font-semibold text-foreground">{awb}</span>
        {shippingMethod === "shiprocket" && (
          <button
            onClick={fetchTracking}
            className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 font-body text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : <MapPinned size={10} />}
            {open && tracking ? "Hide Tracking" : "Track Shipment"}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center gap-2 py-3">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span className="font-body text-xs text-muted-foreground">Fetching live tracking…</span>
              </div>
            ) : error ? (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2">
                <p className="font-body text-xs text-red-600 dark:text-red-400">Could not fetch tracking: {error}</p>
              </div>
            ) : shippingMethod !== "shiprocket" ? (
              <div className="rounded-lg bg-secondary/60 px-3 py-2">
                <p className="font-body text-xs text-muted-foreground">Live tracking is not available for personal couriers. Contact the seller for updates.</p>
              </div>
            ) : track ? (
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
                {/* Current status */}
                {currentStatus && (
                  <div className="flex items-center justify-between">
                    <p className="font-body text-xs font-semibold text-foreground">{currentStatus}</p>
                    {edd && (
                      <p className="font-body text-[10px] text-muted-foreground">
                        EDD: {new Date(edd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                )}

                {/* Activity timeline */}
                {activities.length > 0 && (
                  <div className="relative space-y-0">
                    {activities.slice(0, 8).map((a, idx) => (
                      <div key={idx} className="relative flex gap-3 pb-3 last:pb-0">
                        {/* Timeline line */}
                        {idx < Math.min(activities.length, 8) - 1 && (
                          <div className="absolute left-[5px] top-[14px] bottom-0 w-px bg-border" />
                        )}
                        {/* Dot */}
                        <div className={`relative z-10 mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 ${
                          idx === 0 ? "border-primary bg-primary" : "border-border bg-background"
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="font-body text-[11px] font-medium text-foreground leading-tight">{a.activity}</p>
                          <p className="font-body text-[10px] text-muted-foreground mt-0.5">
                            {a.location && <>{a.location} · </>}
                            {new Date(a.date).toLocaleString("en-IN", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {activities.length > 8 && (
                      <p className="font-body text-[10px] text-muted-foreground pl-6">
                        +{activities.length - 8} earlier updates
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Orders Section ───────────────────────────────────────────────────────────

const ORDER_STATUS_STYLE: Record<string, string> = {
  pending:          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed:        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  processing:       "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  shipped:          "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  out_for_delivery: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  delivered:        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled:        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded:         "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", processing: "Processing",
  shipped: "Shipped", out_for_delivery: "Out for Delivery",
  delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded",
};

// ─── Delivery Progress Bar ────────────────────────────────────────────────────

const DELIVERY_STEPS = [
  { key: "pending",          label: "Ordered"    },
  { key: "confirmed",        label: "Confirmed"  },
  { key: "processing",       label: "Processing" },
  { key: "shipped",          label: "Shipped"    },
  { key: "out_for_delivery", label: "On the Way" },
  { key: "delivered",        label: "Delivered"  },
];

const DeliveryProgress = ({ status }: { status: string }) => {
  if (status === "cancelled" || status === "refunded") {
    return (
      <div className={`rounded-xl px-4 py-3 text-center ${
        status === "cancelled"
          ? "bg-red-50 dark:bg-red-900/20"
          : "bg-gray-100 dark:bg-gray-800/40"
      }`}>
        <p className={`font-body text-sm font-semibold ${
          status === "cancelled"
            ? "text-red-700 dark:text-red-400"
            : "text-gray-600 dark:text-gray-400"
        }`}>
          {status === "cancelled" ? "Order Cancelled" : "Order Refunded"}
        </p>
      </div>
    );
  }

  const currentIdx = DELIVERY_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="rounded-xl bg-secondary/40 px-4 py-5">
      <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Delivery Progress
      </p>
      <div className="relative flex items-start justify-between">
        {/* Background track */}
        <div className="absolute top-3.5 left-[16px] right-[16px] h-0.5 bg-border" />
        {/* Filled track */}
        <div
          className="absolute top-3.5 left-[16px] h-0.5 bg-primary transition-all duration-700 ease-out"
          style={{
            width: currentIdx <= 0
              ? "0%"
              : `calc(${(currentIdx / (DELIVERY_STEPS.length - 1)) * 100}% - 32px)`,
          }}
        />

        {DELIVERY_STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-2" style={{ flex: 1 }}>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isDone
                    ? "border-primary bg-primary"
                    : isCurrent
                    ? "border-primary bg-background"
                    : "border-border bg-background"
                }`}
              >
                {isDone ? (
                  <Check size={12} className="text-primary-foreground" />
                ) : isCurrent ? (
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-border" />
                )}
              </div>
              <p
                className={`font-body text-center leading-tight ${
                  isCurrent
                    ? "text-[10px] font-bold text-primary"
                    : isDone
                    ? "text-[9px] text-muted-foreground"
                    : "text-[9px] text-muted-foreground/40"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Orders Section ───────────────────────────────────────────────────────────

const OrdersSection = ({ userId }: { userId: string }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["user-orders", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(slug))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">My Orders</h2>
        <p className="font-body text-sm text-muted-foreground mt-1">Track and manage your orders.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <ShoppingBag size={36} className="text-muted-foreground/40" />
          <p className="font-display text-lg font-semibold text-foreground">No orders yet</p>
          <p className="font-body text-sm text-muted-foreground max-w-xs">
            Once you place an order, all your order history and tracking details will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(orders as unknown as {
            id: string; created_at: string; status: string; total: number;
            discount_amount: number; coupon_code: string | null;
            payment_method: string; shiprocket_awb: string | null; shipping_method: string | null;
            shipping_address: { full_name: string; line1: string; line2?: string; city: string; state: string; pincode: string };
            order_items: { id: string; product_name: string; product_image: string | null; price: number; quantity: number; products: { slug: string } | null }[];
          }[]).map((order) => {
            const isOpen = expandedId === order.id;
            const date = new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            return (
              <div key={order.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <button
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3">
                    <div>
                      <p className="font-body text-xs text-muted-foreground">Order ID</p>
                      <p className="font-body text-sm font-medium text-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
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
                  <span className={`shrink-0 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${ORDER_STATUS_STYLE[order.status] ?? ""}`}>
                    {ORDER_STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <ChevronRight size={14} className={`text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border px-5 py-5 space-y-5">

                        {/* Delivery progress */}
                        <DeliveryProgress status={order.status} />

                        {/* Items — larger cards */}
                        <div>
                          <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Items Ordered</p>
                          <div className="space-y-3">
                            {order.order_items.map((item) => {
                              const slug = item.products?.slug;
                              return (
                                <div key={item.id} className="flex items-center gap-4 rounded-xl bg-secondary/40 p-3">
                                  <Link to={slug ? `/product/${slug}` : "#"} className="shrink-0 transition-opacity hover:opacity-80">
                                    {item.product_image ? (
                                      <img
                                        src={item.product_image}
                                        alt={item.product_name}
                                        className="h-16 w-16 rounded-xl object-cover border border-border"
                                      />
                                    ) : (
                                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary border border-border">
                                        <Package size={20} className="text-muted-foreground" />
                                      </div>
                                    )}
                                  </Link>
                                  <div className="flex-1 min-w-0">
                                    <Link to={slug ? `/product/${slug}` : "#"} className="hover:text-primary transition-colors">
                                      <p className="font-body text-sm font-medium text-foreground">{item.product_name}</p>
                                    </Link>
                                    <p className="font-body text-xs text-muted-foreground mt-0.5">
                                      Qty {item.quantity} × ₹{item.price}
                                    </p>
                                  </div>
                                  <p className="font-body text-sm font-bold text-foreground shrink-0">₹{item.price * item.quantity}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Price summary */}
                        <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2 font-body text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span>₹{Number(order.total) + Number(order.discount_amount)}</span>
                          </div>
                          {order.discount_amount > 0 && (
                            <div className="flex justify-between text-primary">
                              <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
                              <span>−₹{order.discount_amount}</span>
                            </div>
                          )}
                          <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground">
                            <span>{order.payment_method === "cod" ? "Total (Pay on Delivery)" : "Total Paid"}</span>
                            <span>₹{order.total}</span>
                          </div>
                        </div>

                        {/* Tracking + address row */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          {/* Delivery address */}
                          <div className="rounded-xl bg-secondary/40 px-4 py-3">
                            <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Deliver to</p>
                            <p className="font-body text-sm font-medium text-foreground">{order.shipping_address.full_name}</p>
                            <p className="font-body text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {order.shipping_address.line1}{order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""},{" "}
                              {order.shipping_address.city}, {order.shipping_address.state} – {order.shipping_address.pincode}
                            </p>
                          </div>

                          {/* Tracking / payment */}
                          <div className="rounded-xl bg-secondary/40 px-4 py-3">
                            <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Payment & Shipping</p>
                            <p className="font-body text-xs text-foreground">{order.payment_method === "cod" ? "Cash on Delivery" : "Paid Online (Razorpay)"}</p>
                            {order.shiprocket_awb ? (
                              <ShiprocketTracker awb={order.shiprocket_awb} shippingMethod={order.shipping_method} />
                            ) : (
                              <p className="mt-1 font-body text-xs text-muted-foreground">Tracking not yet assigned</p>
                            )}
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Profile Page ────────────────────────────────────────────────────────

const adminNavItems: { id: Section; label: string; icon: React.ElementType; description: string }[] = [
  { id: "profile",         label: "Account",  icon: User,            description: "Name, email & photo" },
  { id: "admin-products",  label: "Products", icon: Package,         description: "Manage catalogue" },
  { id: "admin-orders",    label: "Orders",   icon: LayoutDashboard, description: "Shop & custom orders" },
];

const ProfilePage = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { isAdmin } = useIsAdmin();

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile picture updated!");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      // Profile row missing (user pre-dates the trigger) — create it now
      if (!data) {
        const { data: created, error: insertError } = await supabase
          .from("profiles")
          .upsert({ id: user!.id })
          .select()
          .single();
        if (insertError) throw insertError;
        return created as Profile;
      }
      return data as Profile;
    },
    enabled: !!user,
  });

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Address[];
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: { full_name: string; phone: string }) => {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-10 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">

          {/* ── Left Sidebar ── */}
          <aside className="w-full shrink-0 lg:w-64">
            {/* User summary card */}
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
                  onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.removeAttribute("style"); }}
                />
              ) : null}
              <div
                style={profile?.avatar_url ? { display: "none" } : undefined}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary ring-2 ring-primary/20"
              >
                <User size={20} className="text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-body font-semibold text-foreground truncate">
                  {profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "My Account"}
                </p>
                <p className="font-body text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            {/* Nav list */}
            <nav className="overflow-hidden rounded-2xl border border-border bg-card">
              {(isAdmin ? adminNavItems : navItems).map((item, index, arr) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const isLast = index === arr.length - 1;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                      !isLast ? "border-b border-border" : ""
                    } ${
                      isActive
                        ? "bg-primary/8 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? "bg-primary/15" : "bg-secondary"
                      }`}
                    >
                      <Icon size={15} className={isActive ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-body text-sm font-medium leading-tight ${isActive ? "text-primary" : "text-foreground"}`}>
                        {item.label}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    {item.id === "addresses" && addresses.length > 0 && (
                      <span className="rounded-full bg-secondary px-1.5 py-0.5 font-body text-[10px] font-semibold text-muted-foreground">
                        {addresses.length}
                      </span>
                    )}
                    <ChevronRight
                      size={14}
                      className={`shrink-0 transition-opacity ${isActive ? "opacity-100 text-primary" : "opacity-30"}`}
                    />
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ── Right Content ── */}
          <div className="flex-1 min-w-0">
            <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
              {activeSection === "profile" && (
                <ProfileSection
                  profile={profile}
                  email={user?.email ?? undefined}
                  oauthName={user?.user_metadata?.full_name || user?.user_metadata?.name}
                  onSave={(data) => updateProfile.mutate(data)}
                  saving={updateProfile.isPending}
                  onAvatarClick={() => avatarInputRef.current?.click()}
                  onAvatarChange={handleAvatarUpload}
                  avatarInputRef={avatarInputRef}
                  avatarUploading={avatarUploading}
                />
              )}

              {activeSection === "addresses" && (
                addressesLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <AddressesSection
                    addresses={addresses}
                    userId={user!.id}
                    onRefresh={() =>
                      queryClient.invalidateQueries({ queryKey: ["addresses", user?.id] })
                    }
                  />
                )
              )}

              {activeSection === "orders" && <OrdersSection userId={user!.id} />}
              {activeSection === "admin-products" && <AdminProductsSection />}
              {activeSection === "admin-orders" && <AdminOrdersSection />}
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
