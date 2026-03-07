/**
 * Coupon Routes — /api/coupons/*
 *
 * POST /api/coupons/validate — validates a coupon code server-side
 *
 * Why server-side? Prevents users from manipulating discount amounts in DevTools.
 * The server computes the discount and the client trusts that value.
 */
import { Router, Response } from "express";
import { AuthRequest, requireAuth } from "../middleware/requireAuth.js";
import supabaseAdmin from "../services/supabaseAdmin.js";

const router = Router();

router.post("/validate", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, orderTotal } = req.body as { code: string; orderTotal: number };

  if (!code || typeof orderTotal !== "number") {
    res.status(400).json({ error: "Missing code or orderTotal" });
    return;
  }

  const { data: coupon } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("is_active", true)
    .maybeSingle();

  if (!coupon) {
    res.status(404).json({ error: "Invalid coupon code" });
    return;
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    res.status(400).json({ error: "This coupon has expired" });
    return;
  }

  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    res.status(400).json({ error: "Coupon usage limit has been reached" });
    return;
  }

  if (orderTotal < coupon.min_order_value) {
    res.status(400).json({
      error: `Minimum order value for this coupon is ₹${coupon.min_order_value}`,
    });
    return;
  }

  const discount =
    coupon.discount_type === "percentage"
      ? Math.min(Math.round((orderTotal * Number(coupon.discount_value)) / 100), orderTotal)
      : Math.min(Number(coupon.discount_value), orderTotal);

  res.json({
    coupon: {
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
    },
    discount,
  });
});

export default router;
