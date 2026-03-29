export type ManagedCoupon = {
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  min_order_value: number;
  max_discount_amount: number | null;
};

export const calculateCouponDiscount = (
  subtotal: number,
  coupon: ManagedCoupon | null
) => {
  if (!coupon || subtotal <= 0 || subtotal < coupon.min_order_value) return 0;

  if (coupon.discount_type === "flat") {
    return Math.min(coupon.discount_value, subtotal);
  }

  const rawDiscount = Math.round(((subtotal * coupon.discount_value) / 100) * 100) / 100;
  if (coupon.max_discount_amount === null) return rawDiscount;
  return Math.min(rawDiscount, coupon.max_discount_amount);
};

