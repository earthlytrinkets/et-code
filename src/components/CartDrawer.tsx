import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import GracefulImage from "@/components/GracefulImage";
import { OPEN_AUTH_EVENT } from "@/lib/auth-intent";

const CartDrawer = () => {
  const { items, updateQuantity, removeFromCart, totalItems, totalPrice, drawerOpen, closeDrawer } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Lock body scroll when open (including mobile Safari)
  useEffect(() => {
    if (!drawerOpen) return;
    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [drawerOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    if (drawerOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen, closeDrawer]);

  return createPortal(
    <AnimatePresence>
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Your Cart
                </h2>
                {totalItems > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-body text-xs font-semibold text-primary">
                    {totalItems} {totalItems === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                  <ShoppingBag size={40} className="text-muted-foreground/30" />
                  <p className="font-display text-base font-semibold text-foreground">Your cart is empty</p>
                  <p className="font-body text-sm text-muted-foreground">Browse our collection and add items you love.</p>
                  <button
                    onClick={() => { closeDrawer(); navigate("/shop"); }}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow"
                  >
                    Shop Now <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                      <Link
                        to={`/product/${item.product.slug}`}
                        onClick={closeDrawer}
                        className="shrink-0"
                      >
                        <GracefulImage
                          src={item.product.images[0] ?? ""}
                          alt={item.product.name}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div>
                          <Link
                            to={`/product/${item.product.slug}`}
                            onClick={closeDrawer}
                            className="font-body text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                          >
                            {item.product.name}
                          </Link>
                          <p className="font-body text-sm font-semibold text-primary mt-0.5">
                            ₹{item.product.price}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 rounded-full border border-border px-1 py-0.5">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="font-body text-xs font-bold text-foreground min-w-[20px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-display text-lg font-bold text-foreground">₹{totalPrice.toLocaleString("en-IN")}</span>
                </div>
                <p className="font-body text-xs text-muted-foreground">
                  Shipping & coupons calculated at checkout.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { closeDrawer(); navigate("/cart"); }}
                    className="flex-1 rounded-full border border-border py-2.5 font-body text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    View Cart
                  </button>
                  <button
                    onClick={() => {
                      closeDrawer();
                      if (!user) {
                        window.dispatchEvent(new Event(OPEN_AUTH_EVENT));
                        return;
                      }
                      navigate("/checkout/address");
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow"
                  >
                    Checkout <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CartDrawer;
