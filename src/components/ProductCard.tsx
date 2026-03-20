import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ShoppingBag, Plus, Minus, Star } from "lucide-react";
import GracefulImage from "@/components/GracefulImage";
import type { Product } from "@/types/product";

const ProductCard = ({ product }: { product: Product }) => {
  const { items, addToCart, updateQuantity } = useCart();
  const { isAdmin, roleChecked } = useIsAdmin();

  const cartItem = items.find((i) => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;

  const imageUrl = product.images[0] ?? "";
  const categoryLabel = product.categories?.name ?? "";
  const isOutOfStock = product.stock === 0 && !product.is_coming_soon;
  const isComingSoon = product.is_coming_soon;
  const isUnavailable = isOutOfStock || isComingSoon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <Link to={`/product/${product.slug}`} className="block">
        <div className={`relative overflow-hidden rounded-lg bg-secondary ${isUnavailable ? "opacity-60" : ""}`}>
          <GracefulImage
            src={imageUrl}
            alt={product.name}
            className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Availability overlay */}
          {isUnavailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="rounded-full bg-black/70 px-3 py-1.5 font-body text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                {isComingSoon ? "Coming Soon" : "Out of Stock"}
              </span>
            </div>
          )}
          {!isUnavailable && product.is_new && (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 font-body text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              New
            </span>
          )}
          {!isUnavailable && product.compare_at_price && (
            <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 font-body text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
              Sale
            </span>
          )}
          {!(roleChecked && isAdmin) && !isUnavailable && (
            <div className="absolute bottom-2 right-2">
              {qty === 0 ? (
                /* ── Small cart icon ── */
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    addToCart({ id: product.id, name: product.name, slug: product.slug, price: product.price, images: product.images, stock: product.stock });
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm shadow-soft text-foreground transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
                >
                  <ShoppingBag size={14} />
                </button>
              ) : (
                /* ── Quantity controls ── */
                <div className="flex items-center gap-0.5 rounded-full bg-card/90 backdrop-blur-sm px-1 py-1 shadow-soft">
                  <button
                    onClick={(e) => { e.preventDefault(); updateQuantity(product.id, qty - 1); }}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-foreground transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="font-body text-xs font-bold text-foreground min-w-[16px] text-center">{qty}</span>
                  <button
                    onClick={(e) => { e.preventDefault(); addToCart({ id: product.id, name: product.name, slug: product.slug, price: product.price, images: product.images, stock: product.stock }); }}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-foreground transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Link>
      <div className="mt-3 px-1">
        <p className="font-body text-xs text-muted-foreground">{categoryLabel}</p>
        <Link to={`/product/${product.slug}`}>
          <h3 className="mt-1 font-display text-base font-medium text-foreground transition-colors hover:text-primary">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-body text-sm font-semibold text-foreground">₹{product.price}</span>
          {product.compare_at_price && (
            <span className="font-body text-xs text-muted-foreground line-through">₹{product.compare_at_price}</span>
          )}
        </div>
        {product.rating > 0 && (
          <div className="mt-1 flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={10} className={i < Math.round(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-border"} />
              ))}
            </div>
            <span className="font-body text-[10px] text-muted-foreground">
              ({product.review_count})
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProductCard;
