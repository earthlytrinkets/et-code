import Razorpay from "razorpay";
import { getOrderAmount } from "./order-utils.js";

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, items, couponCode } = req.body;
    const pricing = await getOrderAmount({ userId, rawItems: items, couponCode });
    const amount = Math.round(pricing.total * 100);

    if (!amount || amount < 100) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return res.status(200).json({
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
      pricing,
    });
  } catch (err) {
    console.error("Razorpay create-order error:", err);
    return res.status(500).json({ error: err.message || "Failed to create order" });
  }
}
