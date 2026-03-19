import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount } = req.body; // amount in paise (₹1 = 100 paise)

  if (!amount || amount < 100) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return res.status(200).json({
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error("Razorpay create-order error:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
}
