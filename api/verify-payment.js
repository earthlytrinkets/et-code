import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS so we can insert orders server-side
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    items,          // [{ product_id, name, price, quantity }]
    shippingAddress,
    totalAmount,
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
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id:             userId,
        status:              "confirmed",
        subtotal:            totalAmount,
        total:               totalAmount,
        shipping_fee:        0,
        discount_amount:     0,
        payment_method:      "razorpay",
        razorpay_order_id,
        razorpay_payment_id,
        shipping_address:    shippingAddress,
      })
      .select("id")
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map((item) => ({
      order_id:      order.id,
      product_id:    item.product_id,
      product_name:  item.name,
      product_image: item.image ?? null,
      price:         item.price,
      quantity:      item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return res.status(200).json({ success: true, orderId: order.id });
  } catch (err) {
    console.error("verify-payment DB error:", err);
    return res.status(500).json({ error: "Payment verified but failed to save order" });
  }
}
