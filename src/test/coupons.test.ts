import { describe, expect, it } from "vitest";
import { calculateCouponDiscount } from "@/lib/coupons";

describe("calculateCouponDiscount", () => {
  it("caps percentage coupons when a max discount is set", () => {
    expect(
      calculateCouponDiscount(5000, {
        code: "SAVE20",
        discount_type: "percentage",
        discount_value: 20,
        min_order_value: 0,
        max_discount_amount: 600,
      })
    ).toBe(600);
  });

  it("respects minimum order values", () => {
    expect(
      calculateCouponDiscount(499, {
        code: "FLAT100",
        discount_type: "flat",
        discount_value: 100,
        min_order_value: 500,
        max_discount_amount: null,
      })
    ).toBe(0);
  });
});
