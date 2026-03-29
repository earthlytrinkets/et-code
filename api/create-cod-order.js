import { createOrderWithPricing } from "./order-utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, items, shippingAddress, couponCode } = req.body;
    const order = await createOrderWithPricing({
      userId,
      rawItems: items,
      shippingAddress,
      paymentMethod: "cod",
      couponCode,
    });

    return res.status(200).json({ success: true, ...order });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to place order." });
  }
}
