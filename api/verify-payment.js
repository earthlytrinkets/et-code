import crypto from "crypto";
import { createOrderWithPricing } from "./order-utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    items,
    shippingAddress,
    couponCode,
  } = req.body;

  // ── 1. Verify signature ──────────────────────────────────────────────────
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  // ── 2. Save order to Supabase ────────────────────────────────────────────
  try {
    const order = await createOrderWithPricing({
      userId,
      rawItems: items,
      shippingAddress,
      paymentMethod: "razorpay",
      couponCode,
      razorpay_order_id,
      razorpay_payment_id,
    });

    return res.status(200).json({ success: true, orderId: order.orderId });
  } catch (err) {
    console.error("verify-payment DB error:", err);
    return res.status(500).json({ error: err.message || "Payment verified but failed to save order" });
  }
}
