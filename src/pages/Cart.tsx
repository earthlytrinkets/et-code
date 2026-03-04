import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import GracefulImage from "@/components/GracefulImage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Minus, Plus, X, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <ShoppingBag size={48} className="text-muted-foreground/30" />
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Your cart is empty</h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">Discover our handcrafted pieces</p>
          <Link
            to="/shop"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-body text-sm font-semibold text-primary-foreground"
          >
            Shop Now <ArrowRight size={14} />
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-12 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Cart ({totalItems})</h1>

        <div className="mt-8 grid gap-12 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <motion.div
                key={item.product.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-4 rounded-xl bg-card p-4 shadow-soft"
              >
                <GracefulImage
                  src={item.product.images[0] ?? ""}
                  alt={item.product.name}
                  className="h-24 w-24 rounded-lg object-cover"
                />
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-foreground">{item.product.name}</h3>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-destructive">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full bg-secondary">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="rounded-full p-2 text-muted-foreground hover:text-foreground"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-body text-sm font-medium text-foreground w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="rounded-full p-2 text-muted-foreground hover:text-foreground"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="font-body text-sm font-semibold text-foreground">₹{item.product.price * item.quantity}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-xl bg-card p-6 shadow-soft h-fit">
            <h2 className="font-display text-lg font-semibold text-foreground">Order Summary</h2>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between font-body text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">₹{totalPrice}</span>
              </div>
              <div className="flex justify-between font-body text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-primary font-medium">Free</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-body text-base font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">₹{totalPrice}</span>
              </div>
            </div>
            <button className="mt-6 w-full rounded-full bg-primary py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow">
              Proceed to Checkout
            </button>
            <p className="mt-3 text-center font-body text-xs text-muted-foreground">
              Secure checkout powered by Razorpay
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
