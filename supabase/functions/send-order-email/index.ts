import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "orders@earthlytrinkets.in";
const ADMIN_EMAIL = "business.earthlytrinkets@gmail.com";
const SITE_URL = "https://earthlytrinkets.in";

const BRAND_GREEN = "#4a7c59";
const BRAND_BG = "#f5f0eb";
const BRAND_TEXT = "#2d2015";

// ─── Email templates ──────────────────────────────────────────────────────────

function itemsTable(items: { product_name: string; quantity: number; price: number }[]) {
  return items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e8e0d5;font-size:14px;color:${BRAND_TEXT}">
        ${item.product_name}
        ${item.quantity > 1 ? `<span style="color:#888;font-size:12px"> × ${item.quantity}</span>` : ""}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e0d5;font-size:14px;color:${BRAND_TEXT};text-align:right;white-space:nowrap">
        ₹${item.price * item.quantity}
      </td>
    </tr>`).join("");
}

function customerEmail(order: Record<string, unknown>) {
  const items = order.order_items as { product_name: string; quantity: number; price: number }[];
  const addr = order.shipping_address as Record<string, string>;
  const orderId = `#${(order.id as string).slice(0, 8).toUpperCase()}`;
  const isCOD = order.payment_method === "cod";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:'Georgia',serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07)">

        <!-- Header -->
        <tr><td style="background:${BRAND_GREEN};padding:32px 40px;text-align:center">
          <p style="margin:0;color:rgba(255,255,255,0.75);font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:sans-serif">Earthly Trinkets</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:26px;font-weight:normal;font-style:italic">
            ${isCOD ? "Order Placed!" : "Payment Confirmed!"}
          </h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px">
          <p style="margin:0 0 6px;font-size:14px;color:#666;font-family:sans-serif">Order ID</p>
          <p style="margin:0 0 28px;font-size:20px;font-weight:bold;color:${BRAND_TEXT};font-family:sans-serif;letter-spacing:0.05em">${orderId}</p>

          <p style="margin:0 0 20px;font-size:15px;color:${BRAND_TEXT};line-height:1.6">
            ${isCOD
              ? "Thank you! Your order is confirmed and we're already packing it with care."
              : "Thank you! Your payment was successful and we're preparing your order."}
          </p>

          <!-- Items -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
            <tr><td colspan="2" style="padding-bottom:8px;font-size:11px;font-family:sans-serif;letter-spacing:0.15em;text-transform:uppercase;color:#888;border-bottom:2px solid #e8e0d5">Items Ordered</td></tr>
            ${itemsTable(items)}
            ${(order.discount_amount as number) > 0 ? `
            <tr>
              <td style="padding:10px 0 4px;font-size:13px;color:#666;font-family:sans-serif">
                Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}
              </td>
              <td style="padding:10px 0 4px;font-size:13px;color:${BRAND_GREEN};text-align:right;font-family:sans-serif">−₹${order.discount_amount}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:12px 0 0;font-size:15px;font-weight:bold;color:${BRAND_TEXT};font-family:sans-serif">Total ${isCOD ? "(Pay on Delivery)" : "Paid"}</td>
              <td style="padding:12px 0 0;font-size:15px;font-weight:bold;color:${BRAND_TEXT};text-align:right;font-family:sans-serif">₹${order.total}</td>
            </tr>
          </table>

          <!-- Address -->
          <div style="background:${BRAND_BG};border-radius:10px;padding:16px 20px;margin-bottom:28px">
            <p style="margin:0 0 8px;font-size:11px;font-family:sans-serif;letter-spacing:0.15em;text-transform:uppercase;color:#888">Delivering to</p>
            <p style="margin:0;font-size:14px;color:${BRAND_TEXT};line-height:1.7;font-family:sans-serif">
              <strong>${addr.full_name}</strong><br>
              ${addr.phone}<br>
              ${addr.line1}${addr.line2 ? `, ${addr.line2}` : ""}<br>
              ${addr.city}, ${addr.state} – ${addr.pincode}
            </p>
          </div>

          <div style="text-align:center">
            <a href="${SITE_URL}/profile" style="display:inline-block;background:${BRAND_GREEN};color:#fff;text-decoration:none;padding:12px 28px;border-radius:50px;font-size:13px;font-family:sans-serif;font-weight:600;letter-spacing:0.03em">
              Track Your Order →
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px 28px;text-align:center;border-top:1px solid #e8e0d5">
          <p style="margin:0;font-size:12px;color:#aaa;font-family:sans-serif;line-height:1.6">
            Questions? Reply to this email or reach us at<br>
            <a href="mailto:${ADMIN_EMAIL}" style="color:${BRAND_GREEN};text-decoration:none">${ADMIN_EMAIL}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function adminEmail(order: Record<string, unknown>, customerEmail: string) {
  const items = order.order_items as { product_name: string; quantity: number; price: number }[];
  const addr = order.shipping_address as Record<string, string>;
  const orderId = `#${(order.id as string).slice(0, 8).toUpperCase()}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden">

        <tr><td style="background:${BRAND_GREEN};padding:20px 32px">
          <p style="margin:0;color:#fff;font-size:11px;letter-spacing:0.15em;text-transform:uppercase">New Order Received</p>
          <h2 style="margin:4px 0 0;color:#fff;font-size:22px;font-weight:600">${orderId} — ₹${order.total}</h2>
        </td></tr>

        <tr><td style="padding:28px 32px">
          <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em">Customer</p>
          <p style="margin:0 0 20px;font-size:15px;color:#222">${addr.full_name} · ${addr.phone} · ${customerEmail}</p>

          <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em">Address</p>
          <p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.6">
            ${addr.line1}${addr.line2 ? `, ${addr.line2}` : ""}, ${addr.city}, ${addr.state} – ${addr.pincode}
          </p>

          <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em">Payment</p>
          <p style="margin:0 0 20px;font-size:14px;color:#444">${order.payment_method === "cod" ? "Cash on Delivery" : "Paid Online (Razorpay)"}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
            <tr><td colspan="2" style="padding-bottom:6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #eee">Items</td></tr>
            ${itemsTable(items)}
            <tr>
              <td style="padding:10px 0 0;font-size:15px;font-weight:700;color:#222">Total</td>
              <td style="padding:10px 0 0;font-size:15px;font-weight:700;color:#222;text-align:right">₹${order.total}</td>
            </tr>
          </table>

          <div style="margin-top:24px;text-align:center">
            <a href="${SITE_URL}/admin/orders" style="display:inline-block;background:${BRAND_GREEN};color:#fff;text-decoration:none;padding:10px 24px;border-radius:50px;font-size:13px;font-weight:600">
              View in Admin Panel →
            </a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Send helper ──────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: `Earthly Trinkets <${FROM_EMAIL}>`, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type" },
    });
  }

  try {
    const { orderId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch order with items
    const { data: order, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();
    if (error || !order) throw new Error("Order not found");

    // Get customer email via admin API
    const { data: { user } } = await supabase.auth.admin.getUserById(order.user_id);
    const email = user?.email ?? "";

    const orderId8 = `#${(order.id as string).slice(0, 8).toUpperCase()}`;
    const isCOD = order.payment_method === "cod";

    // Send both emails in parallel
    await Promise.all([
      email && sendEmail(
        email,
        `${isCOD ? "Order Placed" : "Payment Confirmed"} – ${orderId8} | Earthly Trinkets`,
        customerEmail(order)
      ),
      sendEmail(
        ADMIN_EMAIL,
        `New Order ${orderId8} – ₹${order.total} (${isCOD ? "COD" : "Paid"})`,
        adminEmail(order, email)
      ),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
