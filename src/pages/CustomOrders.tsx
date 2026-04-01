import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { motion } from "framer-motion";
import { Upload, Send, X, ImageIcon, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const budgetRanges = ["₹500 - ₹1,000", "₹1,000 - ₹2,500", "₹2,500 - ₹5,000", "₹5,000+"];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface PreviewFile {
  file: File;
  preview: string;
}

const CustomOrders = () => {
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => files.forEach((f) => URL.revokeObjectURL(f.preview));
  }, [files]);

  const addFiles = (incoming: FileList | File[]) => {
    const accepted: PreviewFile[] = [];
    for (const file of Array.from(incoming)) {
      if (files.length + accepted.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} images allowed`);
        break;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 10 MB limit`);
        continue;
      }
      accepted.push({ file, preview: URL.createObjectURL(file) });
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!files.length || !user) return [];
    const folder = user.id;
    const urls: string[] = [];
    for (const { file } of files) {
      const ext = file.name.split(".").pop();
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("custom-order-images")
        .upload(path, file, { contentType: file.type });
      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        throw error;
      }
      urls.push(`${SUPABASE_URL}/storage/v1/object/public/custom-order-images/${path}`);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const customerName = profile?.full_name || "";
      const customerEmail = user.email || "";

      const imageUrls = await uploadImages();
      const { error } = await supabase
        .from("custom_orders")
        .insert({
          name: customerName,
          email: customerEmail,
          description,
          budget_range: budget || null,
          user_id: user.id,
          reference_images: imageUrls,
        });
      if (error) throw error;
      setSubmitted(true);
      supabase.functions.invoke("send-order-email", {
        body: {
          event: "custom_order_request",
          customerName,
          customerEmail,
          description,
          budget: budget || null,
        },
      }).catch(console.error);
    } catch {
      toast.error("Failed to submit enquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      {!authLoading && <main className="container mx-auto px-4 py-12 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-primary">Made just for you</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">Custom Order Enquiry</h1>
          <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground">
            Have a special memory you'd like preserved? A unique design in mind? We'd love to bring your vision to life in resin.
          </p>

          {!user && !authLoading && (
            <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center shadow-soft">
              <LogIn size={24} className="mx-auto text-primary" />
              <p className="mt-3 font-body text-sm font-medium text-foreground">Sign in to submit a custom order enquiry</p>
              <p className="mt-1 font-body text-xs text-muted-foreground">You need an account so we can track your enquiry and respond to you.</p>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow"
              >
                <LogIn size={14} /> Sign In
              </button>
            </div>
          )}

          {submitted ? (
            <div className="mt-12 rounded-xl bg-card p-12 text-center shadow-soft">
              <p className="font-display text-xl font-semibold text-foreground">Enquiry Submitted!</p>
              <p className="mt-2 font-body text-sm text-muted-foreground">We'll get back to you within 48 hours.</p>
            </div>
          ) : user && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
                <label className="font-body text-sm font-medium text-foreground">
                  Reference Images <span className="text-muted-foreground font-normal">(optional, up to {MAX_FILES})</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`mt-1.5 flex items-center justify-center rounded-lg border-2 border-dashed bg-card p-8 text-center transition-colors cursor-pointer ${
                    dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div>
                    <Upload size={24} className="mx-auto text-muted-foreground" />
                    <p className="mt-2 font-body text-xs text-muted-foreground">Click or drag to upload</p>
                    <p className="mt-1 font-body text-[10px] text-muted-foreground/60">JPG, PNG, WebP — max 10 MB each</p>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {files.map((f, i) => (
                      <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                        <img src={f.preview} alt={f.file.name} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X size={16} className="text-white" />
                        </button>
                      </div>
                    ))}
                    {files.length < MAX_FILES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        <ImageIcon size={20} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-50"
              >
                {loading ? "Submitting..." : <><span>Submit Enquiry</span> <Send size={14} /></>}
              </button>
              </div>
            </form>
          )}
        </motion.div>
      </main>}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <Footer />
    </div>
  );
};

export default CustomOrders;
