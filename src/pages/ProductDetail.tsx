import { useParams, Link, useNavigate } from "react-router-dom";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewSection from "@/components/ReviewSection";
import { ShoppingBag, Star, ArrowLeft, ArrowRight, Plus, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  const { data: product, isLoading } = useProduct(slug ?? "");
  const { items, addToCart, updateQuantity } = useCart();
  const { isAdmin, roleChecked } = useIsAdmin();

  const navigate = useNavigate();
  const cartItem = product ? items.find((i) => i.product.id === product.id) : undefined;
  const qty = cartItem?.quantity ?? 0;

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const images = product?.images ?? [];
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [thumbOffset, setThumbOffset] = useState(0);
  const THUMBS_VISIBLE = 4;

  // Preload all product images and track when ready
  const [imagesReady, setImagesReady] = useState(false);
  useEffect(() => {
    if (images.length === 0) return;
    setImagesReady(false);
    let loaded = 0;
    images.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded >= images.length) setImagesReady(true);
      };
      img.src = src;
    });
  }, [images]);

  const prev = () => { setDirection(-1); setActiveIndex((i) => (i - 1 + images.length) % images.length); };
  const next = () => { setDirection(1);  setActiveIndex((i) => (i + 1) % images.length); };
  const goTo = (i: number) => { setDirection(i > activeIndex ? 1 : -1); setActiveIndex(i); };


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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
            {/* Main image */}
            <div className="relative overflow-hidden rounded-xl bg-secondary aspect-square">
              {!imagesReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={activeIndex}
                  custom={direction}
                  variants={{
                    enter: (d) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit:  (d) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <img
                    src={images[activeIndex] ?? ""}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm shadow-soft text-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm shadow-soft text-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => goTo(i)} className={`h-1.5 rounded-full transition-all ${i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-card/70"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip with arrow buttons */}
            {images.length > 1 && (
              <div className="flex items-center gap-2">
                {/* Left arrow */}
                <button
                  onClick={() => setThumbOffset((o) => Math.max(0, o - 1))}
                  disabled={thumbOffset === 0}
                  className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={15} />
                </button>

                {/* Visible thumbnails */}
                <div className="flex flex-1 gap-2 overflow-hidden">
                  {images.slice(thumbOffset, thumbOffset + THUMBS_VISIBLE).map((img, idx) => {
                    const i = thumbOffset + idx;
                    return (
                      <button
                        key={i}
                        ref={(el) => { thumbRefs.current[i] = el; }}
                        onClick={() => goTo(i)}
                        className={`flex-1 aspect-square rounded-lg overflow-hidden border-2 transition-colors ${i === activeIndex ? "border-primary" : "border-transparent"}`}
                      >
                        <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>

                {/* Right arrow */}
                <button
                  onClick={() => setThumbOffset((o) => Math.min(images.length - THUMBS_VISIBLE, o + 1))}
                  disabled={thumbOffset + THUMBS_VISIBLE >= images.length}
                  className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
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

            {product.short_description && (
              <p className="mt-6 font-body text-base italic text-muted-foreground/60 leading-relaxed">{product.short_description}</p>
            )}
            {product.description && (
              <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            )}

            {!(roleChecked && isAdmin) && (
              <div className="mt-8">
                {product.is_coming_soon || product.stock === 0 ? (
                  <button disabled className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-body text-sm font-semibold text-primary-foreground opacity-50 md:w-auto">
                    {product.is_coming_soon ? "Coming Soon" : "Out of Stock"}
                  </button>
                ) : qty === 0 ? (
                  <button
                    onClick={() => addToCart({ id: product.id, name: product.name, slug: product.slug, price: product.price, images: product.images, stock: product.stock })}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow md:w-auto"
                  >
                    <ShoppingBag size={16} /> Add to Cart
                  </button>
                ) : (
                  /* ── Quantity controls + Proceed ── */
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="inline-flex self-start items-center rounded-full border border-border bg-card shadow-soft">
                      <button
                        onClick={() => updateQuantity(product.id, qty - 1)}
                        className="flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="min-w-[48px] text-center font-display text-base font-bold text-foreground">{qty}</span>
                      <button
                        onClick={() => addToCart({ id: product.id, name: product.name, slug: product.slug, price: product.price, images: product.images, stock: product.stock })}
                        className="flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => navigate("/checkout/address")}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow"
                    >
                      Proceed to Checkout <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            )}

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
