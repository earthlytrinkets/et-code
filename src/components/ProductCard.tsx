import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Product } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { ShoppingBag, Heart } from "lucide-react";
import GracefulImage from "@/components/GracefulImage";

import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";
import product5 from "@/assets/product-5.jpg";
import product6 from "@/assets/product-6.jpg";

const imageMap: Record<string, string> = {
  "/product-1": product1,
  "/product-2": product2,
  "/product-3": product3,
  "/product-4": product4,
  "/product-5": product5,
  "/product-6": product6,
};

export const getProductImage = (key: string) => imageMap[key] || product1;

const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useCart();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative overflow-hidden rounded-lg bg-secondary">
          <GracefulImage
            src={getProductImage(product.images[0])}
            alt={product.name}
            className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {product.isNew && (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 font-body text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              New
            </span>
          )}
          {product.originalPrice && (
            <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 font-body text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
              Sale
            </span>
          )}
          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.preventDefault();
                addToCart(product);
              }}
              className="rounded-full bg-card p-2.5 shadow-soft text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <ShoppingBag size={14} />
            </button>
          </div>
        </div>
      </Link>
      <div className="mt-3 px-1">
        <p className="font-body text-xs text-muted-foreground">{product.categoryLabel}</p>
        <Link to={`/product/${product.id}`}>
          <h3 className="mt-1 font-display text-base font-medium text-foreground transition-colors hover:text-primary">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-body text-sm font-semibold text-foreground">₹{product.price}</span>
          {product.originalPrice && (
            <span className="font-body text-xs text-muted-foreground line-through">₹{product.originalPrice}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
