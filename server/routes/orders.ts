/**
 * Order Routes — /api/orders/*
 *
 * This is the @RestController for orders. Handles:
 *   POST /api/orders/cod              — Cash on delivery
 *   POST /api/orders/razorpay/initiate — Create Razorpay order + pending DB record
 *   POST /api/orders/razorpay/verify   — Verify signature, confirm order, decrement stock
 *   POST /api/orders/razorpay/cancel   — Mark order cancelled (modal dismissed)
 *
 * Why server-side?
 *   - The Razorpay KEY_SECRET must never be sent to the browser
 *   - Signature verification prevents "fake payment" attacks
 *   - Stock decrement + order creation happen atomically (service role bypasses RLS)
 */
import { Router, Response } from "express";
import { AuthRequest, requireAuth } from "../middleware/requireAuth.js";
import supabaseAdmin from "../services/supabaseAdmin.js";
import { razorpay, verifyPaymentSignature } from "../services/razorpay.js";

const router = Router();

// ─── Shared helpers ───────────────────────────────────────────────────────────

interface OrderItem {
  productId: string;
  productName: string;
  productImage: string | null;
  price: number;
  quantity: number;
}

interface ShippingAddress {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

interface OrderBody {
  items: OrderItem[];
  selectedAddress: ShippingAddress;
  couponCode: string | null;
  subtotal: number;
  discountAmount: number;
  total: number;
}

const insertOrderItems = async (orderId: string, items: OrderItem[]) => {
  const rows = items.map((item) => ({
    order_id: orderId,
    product_id: item.productId,
    product_name: item.productName,
    product_image: item.productImage,
    price: item.price,
    quantity: item.quantity,
  }));
  await supabaseAdmin.from("order_items").insert(rows);
};

const decrementStock = async (items: OrderItem[]) => {
  await Promise.all(
    items.map((item) =>
      supabaseAdmin.rpc("decrement_product_stock", {
        p_product_id: item.productId,
        p_quantity: item.quantity,
      })
    )
  );
};

// ─── POST /api/orders/cod ─────────────────────────────────────────────────────

router.post("/cod", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { items, selectedAddress, couponCode, subtotal, discountAmount, total }: OrderBody =
    req.body;

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: req.userId,
      status: "confirmed",
      subtotal,
      discount_amount: discountAmount,
      coupon_code: couponCode,
      shipping_fee: 0,
      total,
      payment_method: "cod",
      shipping_address: selectedAddress,
    })
    .select("id")
    .single();

  if (error || !order) {
    res.status(500).json({ error: "Failed to create order" });
    return;
  }

  await insertOrderItems(order.id, items);
  await decrementStock(items);

  res.json({ orderId: order.id });
});

// ─── POST /api/orders/razorpay/initiate ──────────────────────────────────────

router.post(
  "/razorpay/initiate",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { items, selectedAddress, couponCode, subtotal, discountAmount, total }: OrderBody =
      req.body;

    // 1. Create a Razorpay order — this requires the KEY_SECRET (server-only)
    let rzpOrder: { id: string; amount: number; currency: string };
    try {
      // The Razorpay SDK types are imprecise, so we cast the result
      rzpOrder = (await razorpay.orders.create({
        amount: Math.round(total * 100), // Razorpay expects paise (1 INR = 100 paise)
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      })) as { id: string; amount: number; currency: string };
    } catch {
      res.status(502).json({ error: "Failed to create Razorpay order" });
      return;
    }

    // 2. Create a pending DB order so we have an ID to track
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: req.userId,
        status: "pending",
        subtotal,
        discount_amount: discountAmount,
        coupon_code: couponCode,
        shipping_fee: 0,
        total,
        payment_method: "razorpay",
        razorpay_order_id: rzpOrder.id,
        shipping_address: selectedAddress,
      })
      .select("id")
      .single();

    if (error || !order) {
      res.status(500).json({ error: "Failed to create order" });
      return;
    }

    // 3. Insert items (before payment is confirmed — so we have a record even if user bails)
    await insertOrderItems(order.id, items);

    res.json({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,   // in paise — pass directly to Razorpay modal
      currency: rzpOrder.currency,
    });
  }
);

// ─── POST /api/orders/razorpay/verify ────────────────────────────────────────

router.post(
  "/razorpay/verify",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Verify HMAC-SHA256 signature — this is the anti-fraud step that MUST be server-side
    const valid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (!valid) {
      await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
      res.status(400).json({ error: "Invalid payment signature — possible fraud attempt" });
      return;
    }

    // Mark order confirmed and store the payment ID
    await supabaseAdmin
      .from("orders")
      .update({ status: "confirmed", razorpay_payment_id: razorpayPaymentId })
      .eq("id", orderId);

    // Decrement stock using the already-inserted order items
    const { data: orderItems } = await supabaseAdmin
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);

    if (orderItems) {
      await Promise.all(
        orderItems.map((item) =>
          supabaseAdmin.rpc("decrement_product_stock", {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          })
        )
      );
    }

    res.json({ success: true });
  }
);

// ─── POST /api/orders/razorpay/cancel ────────────────────────────────────────

router.post(
  "/razorpay/cancel",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { orderId } = req.body;
    await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    res.json({ success: true });
  }
);

export default router;
