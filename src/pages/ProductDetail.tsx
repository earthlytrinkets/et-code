import { useParams, Link } from "react-router-dom";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import GracefulImage from "@/components/GracefulImage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewSection from "@/components/ReviewSection";
import { ShoppingBag, Star, ArrowLeft, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  const { data: product, isLoading } = useProduct(slug ?? "");
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!product) return;
    addToCart({ id: product.id, name: product.name, slug: product.slug, price: product.price, images: product.images, stock: product.stock });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl text-foreground">Product not found</h1>
          <Link to="/shop" className="mt-4 inline-block font-body text-sm text-primary">Back to Shop</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-12 lg:px-8">
        <Link to="/shop" className="mb-8 inline-flex items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft size={14} /> Back to Shop
        </Link>

        <div className="grid gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden rounded-xl bg-secondary">
            <GracefulImage
              src={product.images[0] ?? ""}
              alt={product.name}
              className="w-full object-cover"
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {product.categories?.name ?? ""}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">{product.name}</h1>

            {product.rating > 0 && (
              <button
                onClick={() => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" })}
                className="mt-3 flex items-center gap-3 hover:opacity-75 transition-opacity"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < Math.round(product.rating) ? "fill-gold text-gold" : "text-border"} />
                  ))}
                </div>
                <span className="font-body text-xs text-muted-foreground underline underline-offset-2">
                  {product.rating} ({product.review_count} {product.review_count === 1 ? "review" : "reviews"})
                </span>
              </button>
            )}

            <div className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold text-foreground">₹{product.price}</span>
              {product.compare_at_price && (
                <span className="font-body text-lg text-muted-foreground line-through">₹{product.compare_at_price}</span>
              )}
            </div>

            <p className="mt-6 font-body text-sm leading-relaxed text-muted-foreground">{product.description}</p>

            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-50 md:w-auto"
            >
              {product.stock === 0
                ? "Out of Stock"
                : added
                ? <><Check size={16} /> Added to Cart</>
                : <><ShoppingBag size={16} /> Add to Cart</>}
            </button>

            {(product.materials.length > 0 || product.care_instructions.length > 0) && (
              <div className="mt-10 space-y-6">
                {product.materials.length > 0 && (
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">Materials</h3>
                    <ul className="mt-2 space-y-1">
                      {product.materials.map((m) => (
                        <li key={m} className="font-body text-sm text-muted-foreground">• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {product.care_instructions.length > 0 && (
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">Care Instructions</h3>
                    <ul className="mt-2 space-y-1">
                      {product.care_instructions.map((c) => (
                        <li key={c} className="font-body text-sm text-muted-foreground">• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>

        <ReviewSection productId={product.id} />
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
