import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Plus, ArrowRight, Check, Home, Briefcase, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Address = {
  id: string;
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

const emptyForm = { label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

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

// ─── Input Field ─────────────────────────────────────────────────────────────
const Field = ({
  label, value, onChange, placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) => (
  <div className="group">
    <label className="font-body text-xs font-semibold text-foreground/70 uppercase tracking-wider">
      {label}{required && <span className="text-primary ml-0.5">*</span>}
    </label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
    />
  </div>
);

const LABEL_ICONS: Record<string, React.ElementType> = { Home, Work: Briefcase, Other: Tag };

// ─── Page ────────────────────────────────────────────────────────────────────
const CheckoutAddress = () => {
  const { user } = useAuth();
  const { setAddress } = useCheckout();
  const { items } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: addresses = [], isLoading } = useQuery({
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
    onSuccess: (data) => {
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    },
  });

  if (items.length === 0) { navigate("/cart"); return null; }

  const handleSaveAddress = async () => {
    if (!form.full_name || !form.phone || !form.line1 || !form.city || !form.state || !form.pincode) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...form, line2: form.line2 || null, user_id: user!.id, is_default: addresses.length === 0 })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      queryClient.invalidateQueries({ queryKey: ["addresses", user?.id] });
      setSelectedId(data.id);
      setShowForm(false);
      setForm(emptyForm);
    }
  };

  const handleContinue = () => {
    const addr = addresses.find((a) => a.id === selectedId);
    if (!addr) return;
    setAddress(addr);
    navigate("/checkout/payment");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 lg:px-8 max-w-3xl">
        <CheckoutStepper current={0} />

        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Delivery Address</h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">Where should we send your order?</p>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
            ))
          ) : (
            addresses.map((addr) => {
              const LabelIcon = LABEL_ICONS[addr.label] ?? MapPin;
              const isSelected = selectedId === addr.id;
              return (
                <motion.div
                  key={addr.id}
                  onClick={() => setSelectedId(addr.id)}
                  whileTap={{ scale: 0.995 }}
                  className={`cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/30"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Radio */}
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                      {isSelected && <Check size={11} strokeWidth={3} className="text-primary-foreground" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-body text-sm font-semibold text-foreground">{addr.full_name}</p>
                        <span className="text-muted-foreground">·</span>
                        <p className="font-body text-sm text-muted-foreground">{addr.phone}</p>
                      </div>
                      <p className="font-body text-xs text-muted-foreground leading-relaxed">
                        {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""},{" "}
                        {addr.city}, {addr.state} – {addr.pincode}
                      </p>
                    </div>

                    {/* Label badge */}
                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${isSelected ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                      <LabelIcon size={11} />
                      {addr.label}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}

          {/* Add new address */}
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-soft"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <MapPin size={14} className="text-primary" />
                  </div>
                  <p className="font-display text-base font-semibold text-foreground">New Address</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full Name" required value={form.full_name} onChange={(v) => setForm((f) => ({ ...f, full_name: v }))} placeholder="Your full name" />
                  <Field label="Phone" required value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="10-digit number" />
                  <div className="sm:col-span-2">
                    <Field label="Address Line 1" required value={form.line1} onChange={(v) => setForm((f) => ({ ...f, line1: v }))} placeholder="House/flat no., street name" />
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Address Line 2" value={form.line2} onChange={(v) => setForm((f) => ({ ...f, line2: v }))} placeholder="Area, landmark (optional)" />
                  </div>
                  <Field label="City" required value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} placeholder="City" />
                  <Field label="State" required value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v }))} placeholder="State" />
                  <Field label="Pincode" required value={form.pincode} onChange={(v) => setForm((f) => ({ ...f, pincode: v }))} placeholder="6-digit pincode" />
                  <div className="group">
                    <label className="font-body text-xs font-semibold text-foreground/70 uppercase tracking-wider">Label</label>
                    <select
                      value={form.label}
                      onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
                    >
                      <option>Home</option>
                      <option>Work</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 border-t border-border">
                  <button
                    onClick={handleSaveAddress}
                    disabled={saving}
                    className="rounded-full bg-primary px-6 py-2.5 font-body text-sm font-semibold text-primary-foreground hover:shadow-glow transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save Address"}
                  </button>
                  <button
                    onClick={() => { setShowForm(false); setForm(emptyForm); }}
                    className="rounded-full border border-border px-6 py-2.5 font-body text-sm text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowForm(true)}
                className="group flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-border py-5 font-body text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:text-primary hover:bg-primary/3"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-current transition-colors">
                  <Plus size={14} />
                </div>
                Add new address
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* CTA */}
        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => navigate("/cart")}
            className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to cart
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedId}
            className="inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue to Payment <ArrowRight size={15} />
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutAddress;
