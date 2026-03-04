import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Upload, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const budgetRanges = ["₹500 - ₹1,000", "₹1,000 - ₹2,500", "₹2,500 - ₹5,000", "₹5,000+"];

const CustomOrders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  // Redirect unauthenticated users; redirect admins in the background
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/", { replace: true }); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => { if (data) navigate("/admin/orders", { replace: true }); });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from("custom_orders" as never)
      .insert({ name, email, description, budget_range: budget || null } as never);
    if (error) {
      toast.error("Failed to submit request. Please try again.");
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      {!authLoading && user && <main className="container mx-auto px-4 py-12 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-primary">Made just for you</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">Custom Orders</h1>
          <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground">
            Have a special memory you'd like preserved? A unique design in mind? We'd love to bring your vision to life in resin.
          </p>

          {submitted ? (
            <div className="mt-12 rounded-xl bg-card p-12 text-center shadow-soft">
              <p className="font-display text-xl font-semibold text-foreground">✨ Request Submitted!</p>
              <p className="mt-2 font-body text-sm text-muted-foreground">We'll get back to you within 48 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="font-body text-sm font-medium text-foreground">Name</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-card px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="font-body text-sm font-medium text-foreground">Email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-card px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="font-body text-sm font-medium text-foreground">Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-card px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Describe what you'd like us to create..."
                />
              </div>

              <div>
                <label className="font-body text-sm font-medium text-foreground">Budget Range</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {budgetRanges.map((range) => (
                    <label key={range} className="cursor-pointer">
                      <input
                        type="radio"
                        name="budget"
                        value={range}
                        checked={budget === range}
                        onChange={() => setBudget(range)}
                        className="peer sr-only"
                      />
                      <span className="block rounded-full border border-border px-4 py-2 font-body text-xs text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground hover:bg-secondary">
                        {range}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-body text-sm font-medium text-foreground">Reference Image (optional)</label>
                <div className="mt-1.5 flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-primary/50">
                  <div>
                    <Upload size={24} className="mx-auto text-muted-foreground" />
                    <p className="mt-2 font-body text-xs text-muted-foreground">Click or drag to upload</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-50"
              >
                {loading ? "Submitting..." : <><span>Submit Request</span> <Send size={14} /></>}
              </button>
            </form>
          )}
        </motion.div>
      </main>}
      <Footer />
    </div>
  );
};

export default CustomOrders;
