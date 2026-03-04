import { createContext, useContext, useState, ReactNode } from "react";

export interface CheckoutAddress {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface CheckoutCoupon {
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
}

interface CheckoutContextType {
  selectedAddress: CheckoutAddress | null;
  appliedCoupon: CheckoutCoupon | null;
  discountAmount: number;
  setAddress: (address: CheckoutAddress) => void;
  setCoupon: (coupon: CheckoutCoupon | null, amount: number) => void;
  clearCheckout: () => void;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

const SESSION_KEY = "et_checkout";

const loadSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveSession = (data: object) => {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
};

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const saved = loadSession();
  const [selectedAddress, setSelectedAddress] = useState<CheckoutAddress | null>(saved.selectedAddress ?? null);
  const [appliedCoupon, setAppliedCoupon] = useState<CheckoutCoupon | null>(saved.appliedCoupon ?? null);
  const [discountAmount, setDiscountAmount] = useState<number>(saved.discountAmount ?? 0);

  const setAddress = (address: CheckoutAddress) => {
    setSelectedAddress(address);
    saveSession({ selectedAddress: address, appliedCoupon, discountAmount });
  };

  const setCoupon = (coupon: CheckoutCoupon | null, amount: number) => {
    setAppliedCoupon(coupon);
    setDiscountAmount(amount);
    saveSession({ selectedAddress, appliedCoupon: coupon, discountAmount: amount });
  };

  const clearCheckout = () => {
    setSelectedAddress(null);
    setAppliedCoupon(null);
    setDiscountAmount(0);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <CheckoutContext.Provider value={{ selectedAddress, appliedCoupon, discountAmount, setAddress, setCoupon, clearCheckout }}>
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckout = () => {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
};
