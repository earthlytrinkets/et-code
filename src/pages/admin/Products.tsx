import { useState, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllProducts, useCategories } from "@/hooks/useProducts";
import type { Product } from "@/types/product";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Star, Upload, X, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductForm = {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  price: string;
  compare_at_price: string;
  category_id: string;
  stock: string;
  materials: string;        // comma-separated
  care_instructions: string; // comma-separated
  tags: string;             // comma-separated
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  images: string[];         // existing URLs
};

const EMPTY_FORM: ProductForm = {
  name: "", slug: "", short_description: "", description: "",
  price: "", compare_at_price: "", category_id: "", stock: "0",
  materials: "", care_instructions: "", tags: "",
  is_active: true, is_featured: false, is_new: false, images: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const uploadImage = async (file: File): Promise<string> => {
  const ext = file.name.split(".").pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(filename, file, { upsert: false });
  if (error) throw error;
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${filename}`;
};

// ─── Image Uploader ───────────────────────────────────────────────────────────

const ImageUploader = ({
  images,
  onChange,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(uploadImage));
      onChange([...images, ...urls]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={url} className="relative">
            <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover border border-border" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {uploading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <>
              <Upload size={16} />
              <span className="mt-1 text-[10px]">Upload</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};

// ─── Product Form Modal ───────────────────────────────────────────────────────

const ProductFormModal = ({
  initial,
  onClose,
}: {
  initial?: Product;
  onClose: () => void;
}) => {
  const { data: categories = [] } = useCategories();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ProductForm>(
    initial
      ? {
          name: initial.name,
          slug: initial.slug,
          short_description: initial.short_description ?? "",
          description: initial.description ?? "",
          price: String(initial.price),
          compare_at_price: initial.compare_at_price ? String(initial.compare_at_price) : "",
          category_id: initial.category_id ?? "",
          stock: String(initial.stock),
          materials: initial.materials.join(", "),
          care_instructions: initial.care_instructions.join(", "),
          tags: initial.tags.join(", "),
          is_active: initial.is_active,
          is_featured: initial.is_featured,
          is_new: initial.is_new,
          images: initial.images,
        }
      : EMPTY_FORM
  );

  const set = (key: keyof ProductForm, value: ProductForm[keyof ProductForm]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || toSlug(form.name),
        short_description: form.short_description.trim() || null,
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        category_id: form.category_id || null,
        stock: parseInt(form.stock) || 0,
        materials: form.materials.split(",").map((s) => s.trim()).filter(Boolean),
        care_instructions: form.care_instructions.split(",").map((s) => s.trim()).filter(Boolean),
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
        is_active: form.is_active,
        is_featured: form.is_featured,
        is_new: form.is_new,
        images: form.images,
      };

      if (initial) {
        const { error } = await supabase.from("products").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(initial ? "Product updated" : "Product created");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-elevated my-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">
            {initial ? "Edit Product" : "New Product"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Images */}
          <div>
            <Label>Images</Label>
            <div className="mt-1.5">
              <ImageUploader images={form.images} onChange={(urls) => set("images", urls)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  set("slug", toSlug(e.target.value));
                }}
                placeholder="Lavender Dream Pendant"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Slug (URL)</Label>
              <Input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="lavender-dream-pendant"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={form.category_id}
                onChange={(e) => set("category_id", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
              >
                <option value="">— No category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Price (₹) *</Label>
              <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="1299" />
            </div>

            <div className="space-y-1.5">
              <Label>Compare-at Price (₹)</Label>
              <Input type="number" value={form.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value)} placeholder="1599" />
            </div>

            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="10" />
            </div>

            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="resin, floral, handmade" />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Short Description</Label>
              <Input value={form.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="One line summary" />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Full Description</Label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Detailed product description..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Materials (comma-separated)</Label>
              <Input value={form.materials} onChange={(e) => set("materials", e.target.value)} placeholder="Epoxy resin, Dried lavender, Silver chain" />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Care Instructions (comma-separated)</Label>
              <Input value={form.care_instructions} onChange={(e) => set("care_instructions", e.target.value)} placeholder="Avoid sunlight, Keep dry" />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6 pt-2">
            {([
              { key: "is_active", label: "Active (visible in shop)" },
              { key: "is_featured", label: "Featured (on homepage)" },
              { key: "is_new", label: "Mark as New" },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  onChange={(e) => set(key, e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="font-body text-sm text-foreground">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name || !form.price}>
            {save.isPending ? "Saving…" : initial ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Admin Products Page ─────────────────────────────────────────────────

const AdminProducts = () => {
  const { data: products = [], isLoading } = useAllProducts();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | null | "new">(null);

  const toggle = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase.from("products").update({ [field]: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
    onError: () => toast.error("Update failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
    onError: () => toast.error("Delete failed"),
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Products</h1>
            <p className="font-body text-sm text-muted-foreground">{products.length} total</p>
          </div>
          <Button onClick={() => setEditing("new")}>
            <Plus size={14} className="mr-1.5" /> Add Product
          </Button>
        </div>

        {isLoading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left">
                  <th className="px-4 py-3 font-body text-xs font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-3 font-body text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="px-4 py-3 font-body text-xs font-semibold text-muted-foreground">Price</th>
                  <th className="px-4 py-3 font-body text-xs font-semibold text-muted-foreground">Stock</th>
                  <th className="px-4 py-3 font-body text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-body text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          <img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                            <ImageIcon size={14} className="text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-body font-medium text-foreground">{p.name}</p>
                          <p className="font-body text-xs text-muted-foreground">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-body text-muted-foreground">{p.categories?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-body text-foreground">
                      ₹{p.price}
                      {p.compare_at_price && (
                        <span className="ml-1 text-xs text-muted-foreground line-through">₹{p.compare_at_price}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-body text-foreground">{p.stock}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          title={p.is_active ? "Deactivate" : "Activate"}
                          onClick={() => toggle.mutate({ id: p.id, field: "is_active", value: !p.is_active })}
                          className={`rounded-full p-1.5 transition-colors ${p.is_active ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-secondary"}`}
                        >
                          {p.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          title={p.is_featured ? "Unfeature" : "Feature"}
                          onClick={() => toggle.mutate({ id: p.id, field: "is_featured", value: !p.is_featured })}
                          className={`rounded-full p-1.5 transition-colors ${p.is_featured ? "text-amber-500 hover:bg-amber-50" : "text-muted-foreground hover:bg-secondary"}`}
                        >
                          <Star size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditing(p)}
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${p.name}"?`)) remove.mutate(p.id);
                          }}
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {products.length === 0 && (
              <div className="py-16 text-center font-body text-muted-foreground">
                No products yet. Click "Add Product" to create the first one.
              </div>
            )}
          </div>
        )}
      </main>

      {editing !== null && (
        <ProductFormModal
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

export default AdminProducts;
