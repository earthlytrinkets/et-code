import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import type { CartProduct } from "@/types/product";
import { useAuth } from "@/contexts/AuthContext";
import { PENDING_CART_PRODUCT_KEY } from "@/lib/auth-intent";

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: CartProduct) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("et_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("et_cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!user) return;

    try {
      const raw = localStorage.getItem(PENDING_CART_PRODUCT_KEY);
      if (!raw) return;

      const product = JSON.parse(raw) as CartProduct;
      localStorage.removeItem(PENDING_CART_PRODUCT_KEY);

      setItems((prev) => {
        const existing = prev.find((i) => i.product.id === product.id);
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [...prev, { product, quantity: 1 }];
      });
    } catch {
      localStorage.removeItem(PENDING_CART_PRODUCT_KEY);
    }
  }, [user]);

  const addToCart = useCallback((product: CartProduct) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const value = useMemo(
    () => ({ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }),
    [items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
