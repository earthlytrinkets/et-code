/**
 * Razorpay Service
 *
 * Wraps the Razorpay SDK and exposes a signature-verification helper.
 * The KEY_SECRET never leaves the server — this is the whole point of the backend.
 *
 * Razorpay signature verification:
 *   HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)
 *   must match the signature sent back by the Razorpay checkout modal.
 */
import Razorpay from "razorpay";
import crypto from "crypto";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const verifyPaymentSignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expected === signature;
};
