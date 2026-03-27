import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "orders@earthlytrinkets.in";
const ADMIN_EMAIL = "business.earthlytrinkets@gmail.com";
const SITE_URL = "https://earthlytrinkets.in";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const C = {
  green:   "#4a7c59",
  bg:      "#f5f0eb",
  white:   "#ffffff",
  text:    "#2d2015",
  muted:   "#8a7a6a",
  border:  "#e8e0d5",
  accent:  "#c96b4a",
};

// ─── Shared building blocks ───────────────────────────────────────────────────

function logoBar() {
  return `
    <table width="100%" style="max-width:580px;margin-bottom:20px" cellpadding="0" cellspacing="0">
      <tr><td style="text-align:center;padding:0 0 20px">
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:28px;color:${C.text}">
          <span style="color:${C.green}">Earthly</span> Trinkets
        </p>
        <p style="margin:3px 0 0;font-family:Arial,sans-serif;font-size:10px;color:${C.muted};letter-spacing:0.25em;text-transform:uppercase">Handcrafted with love</p>
      </td></tr>
    </table>`;
}

function cardHeader(icon: string, title: string, subtitle?: string) {
  return `
    <tr><td style="background:${C.green};padding:36px 40px;text-align:center">
      <div style="display:inline-block;width:60px;height:60px;background:rgba(255,255,255,0.15);border-radius:50%;line-height:60px;font-size:28px;margin-bottom:16px;text-align:center">${icon}</div>
      <h1 style="margin:0;color:${C.white};font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;font-style:italic;line-height:1.3">${title}</h1>
      ${subtitle ? `<p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-family:Arial,sans-serif;font-size:13px">${subtitle}</p>` : ""}
    </td></tr>`;
}

function cardFooter() {
  return `
    <tr><td style="padding:24px 40px 28px;text-align:center;border-top:1px solid ${C.border}">
      <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:15px;color:${C.text}">
        <span style="color:${C.green}">Earthly</span> Trinkets
      </p>
      <p style="margin:0;font-size:12px;color:${C.muted};font-family:Arial,sans-serif;line-height:1.8">
        Questions? Write to us at
        <a href="mailto:${ADMIN_EMAIL}" style="color:${C.green};text-decoration:none">${ADMIN_EMAIL}</a><br>
        &copy; 2025 Earthly Trinkets &middot; Made with &hearts; in India
      </p>
    </td></tr>`;
}

function wrap(headerRow: string, bodyContent: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Earthly Trinkets</title>
</head>
<body style="margin:0;padding:0;background:${C.bg}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px">
    <tr><td align="center">

      ${logoBar()}

      <!-- Card -->
      <table width="100%" style="max-width:580px;background:${C.white};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(45,32,21,0.07)" cellpadding="0" cellspacing="0">

        ${headerRow}

        <!-- Body -->
        <tr><td style="padding:36px 40px">
          ${bodyContent}
        </td></tr>

        ${cardFooter()}

      </table>

      <!-- Bottom note -->
      <table width="100%" style="max-width:580px" cellpadding="0" cellspacing="0">
        <tr><td style="text-align:center;padding:18px 0 0">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#b8a898">
            You're receiving this because you shopped at Earthly Trinkets.
          </p>
        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Reusable components ──────────────────────────────────────────────────────

type Item = { product_name: string; quantity: number; price: number };
type Addr = Record<string, string>;

function itemsRows(items: Item[]) {
  return items.map((i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.text};font-family:Arial,sans-serif">
        ${i.product_name}${i.quantity > 1 ? ` <span style="color:${C.muted};font-size:12px">&times; ${i.quantity}</span>` : ""}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.text};font-family:Arial,sans-serif;text-align:right;white-space:nowrap">
        &#8377;${i.price * i.quantity}
      </td>
    </tr>`).join("");
}

function addressBlock(addr: Addr) {
  return `
    <div style="background:${C.bg};border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.15em;text-transform:uppercase;color:${C.muted}">Delivering to</p>
      <p style="margin:0;font-size:14px;color:${C.text};line-height:1.8;font-family:Arial,sans-serif">
        <strong>${addr.full_name}</strong> &middot; ${addr.phone}<br>
        ${addr.line1}${addr.line2 ? `, ${addr.line2}` : ""}<br>
        ${addr.city}, ${addr.state} &ndash; ${addr.pincode}
      </p>
    </div>`;
}

function ctaButton(text: string, url: string) {
  return `
    <div style="text-align:center;margin-top:28px">
      <a href="${url}" style="display:inline-block;background:${C.green};color:${C.white};text-decoration:none;padding:13px 32px;border-radius:50px;font-size:13px;font-family:Arial,sans-serif;font-weight:700;letter-spacing:0.04em">
        ${text}
      </a>
    </div>`;
}

function orderId8(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function orderLabel(id: string) {
  return `
    <p style="margin:0 0 4px;font-size:11px;color:${C.muted};font-family:Arial,sans-serif;letter-spacing:0.12em;text-transform:uppercase">Order</p>
    <p style="margin:0 0 28px;font-size:22px;font-weight:700;color:${C.text};font-family:Arial,sans-serif;letter-spacing:0.06em">${orderId8(id)}</p>`;
}

// ─── Customer email templates ─────────────────────────────────────────────────

type Order = Record<string, unknown>;

function orderPlacedEmail(order: Order) {
  const items  = order.order_items as Item[];
  const addr   = order.shipping_address as Addr;
  const isCOD  = order.payment_method === "cod";
  const disc   = (order.discount_amount as number) ?? 0;

  return wrap(
    cardHeader(
      isCOD ? "&#128717;" : "&#10003;",
      isCOD ? "Order Placed!" : "Payment Confirmed!",
      "We've received your order and are getting it ready"
    ),
    `${orderLabel(order.id as string)}

    <p style="margin:0 0 28px;font-size:15px;color:${C.text};line-height:1.7;font-family:Arial,sans-serif">
      ${isCOD
        ? "Thank you! Your order is confirmed and we're packing it with care. Please keep the amount ready at the time of delivery."
        : "Thank you! Your payment was successful. We're carefully preparing your order and will dispatch it soon."}
    </p>

    <!-- Items table -->
    <p style="margin:0 0 8px;font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.15em;text-transform:uppercase;color:${C.muted};border-bottom:2px solid ${C.border};padding-bottom:8px">Items Ordered</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      ${itemsRows(items)}
      ${disc > 0 ? `
      <tr>
        <td style="padding:10px 0 4px;font-size:13px;color:${C.muted};font-family:Arial,sans-serif">
          Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}
        </td>
        <td style="padding:10px 0 4px;font-size:13px;color:${C.green};text-align:right;font-family:Arial,sans-serif">
          &minus;&#8377;${disc}
        </td>
      </tr>` : ""}
      <tr>
        <td style="padding:14px 0 0;font-size:15px;font-weight:700;color:${C.text};font-family:Arial,sans-serif">
          Total ${isCOD ? "(Pay on Delivery)" : "Paid"}
        </td>
        <td style="padding:14px 0 0;font-size:15px;font-weight:700;color:${C.text};text-align:right;font-family:Arial,sans-serif">
          &#8377;${order.total}
        </td>
      </tr>
    </table>

    ${addressBlock(addr)}
    ${ctaButton("Track Your Order &rarr;", `${SITE_URL}/profile`)}`
  );
}

function orderConfirmedEmail(order: Order) {
  const addr = order.shipping_address as Addr;
  return wrap(
    cardHeader("&#127807;", "Your Order is Confirmed!", "Our artisans are carefully preparing your pieces"),
    `${orderLabel(order.id as string)}

    <p style="margin:0 0 24px;font-size:15px;color:${C.text};line-height:1.7;font-family:Arial,sans-serif">
      Wonderful news! Your order has been reviewed and confirmed.
      Each piece is handcrafted with attention to detail &mdash; we want to make sure everything is perfect for you.
    </p>

    <!-- Timeline -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr>
        <td style="padding:14px 16px;background:${C.bg};border-radius:10px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:34px;vertical-align:middle">
                <div style="width:28px;height:28px;background:${C.green};border-radius:50%;text-align:center;line-height:28px;font-size:13px;color:${C.white};font-weight:700">&#10003;</div>
              </td>
              <td style="padding-left:12px;vertical-align:middle">
                <p style="margin:0;font-size:13px;font-weight:700;color:${C.text};font-family:Arial,sans-serif">Order Confirmed</p>
                <p style="margin:2px 0 0;font-size:12px;color:${C.muted};font-family:Arial,sans-serif">Reviewed and approved</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height:8px"></td></tr>
      <tr>
        <td style="padding:14px 16px;background:${C.bg};border-radius:10px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:34px;vertical-align:middle">
                <div style="width:28px;height:28px;background:rgba(74,124,89,0.18);border-radius:50%;text-align:center;line-height:28px;font-size:14px;color:${C.green}">&#8594;</div>
              </td>
              <td style="padding-left:12px;vertical-align:middle">
                <p style="margin:0;font-size:13px;font-weight:700;color:${C.text};font-family:Arial,sans-serif">Preparing &amp; Dispatching</p>
                <p style="margin:2px 0 0;font-size:12px;color:${C.muted};font-family:Arial,sans-serif">We'll notify you once it's on its way</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${addressBlock(addr)}
    ${ctaButton("View Order &rarr;", `${SITE_URL}/profile`)}`
  );
}

function orderShippedEmail(order: Order) {
  const addr   = order.shipping_address as Addr;
  const awb    = order.shiprocket_awb as string | null;
  const method = order.shipping_method as string | null;

  return wrap(
    cardHeader("&#128230;", "Your Order is On Its Way!", "Dispatched and heading to you"),
    `${orderLabel(order.id as string)}

    <p style="margin:0 0 24px;font-size:15px;color:${C.text};line-height:1.7;font-family:Arial,sans-serif">
      Exciting! Your order has been dispatched. We've packed everything with care &mdash;
      can't wait for it to reach you!
    </p>

    ${awb ? `
    <div style="background:${C.bg};border-left:4px solid ${C.green};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 6px;font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.15em;text-transform:uppercase;color:${C.muted}">
        ${method === "shiprocket" ? "Shiprocket Tracking" : "Tracking / AWB Number"}
      </p>
      <p style="margin:0;font-size:20px;font-weight:700;color:${C.text};font-family:Arial,sans-serif;letter-spacing:0.06em">${awb}</p>
      ${method === "shiprocket"
        ? `<p style="margin:8px 0 0;font-size:12px;color:${C.muted};font-family:Arial,sans-serif">
            Track at <a href="https://shiprocket.co/tracking/${awb}" style="color:${C.green};text-decoration:none">shiprocket.co/tracking</a>
           </p>`
        : ""}
    </div>` : ""}

    ${addressBlock(addr)}
    ${ctaButton("Track Your Order &rarr;", `${SITE_URL}/profile`)}`
  );
}

function orderOutForDeliveryEmail(order: Order) {
  const addr = order.shipping_address as Addr;
  const awb  = order.shiprocket_awb as string | null;

  return wrap(
    cardHeader("&#128666;", "Arriving Today!", "Your order is out for delivery"),
    `${orderLabel(order.id as string)}

    <p style="margin:0 0 24px;font-size:15px;color:${C.text};line-height:1.7;font-family:Arial,sans-serif">
      Your order is out for delivery and will arrive today!
      Please ensure someone is available at the delivery address to receive your package.
    </p>

    ${awb ? `
    <div style="background:${C.bg};border-radius:10px;padding:14px 18px;margin-bottom:20px">
      <p style="margin:0;font-size:13px;color:${C.muted};font-family:Arial,sans-serif">
        Tracking: <strong style="color:${C.text}">${awb}</strong>
      </p>
    </div>` : ""}

    <!-- Reminder box -->
    <div style="background:#fff8f5;border:1px solid #f0d5c8;border-radius:10px;padding:14px 18px;margin-bottom:24px">
      <p style="margin:0;font-size:13px;color:#8a4a35;font-family:Arial,sans-serif;line-height:1.6">
        &#128161; <strong>Quick reminder:</strong> For COD orders, please keep the exact amount ready.
        If you're unavailable, contact the courier to reschedule delivery.
      </p>
    </div>

    ${addressBlock(addr)}
    ${ctaButton("View Order &rarr;", `${SITE_URL}/profile`)}`
  );
}

function orderDeliveredEmail(order: Order) {
  const items  = order.order_items as Item[];
  const oid    = orderId8(order.id as string);

  const starRow = [1, 2, 3, 4, 5].map((n) => {
    const stars   = "&#11088;".repeat(n);
    const subject = encodeURIComponent(`${"⭐".repeat(n)} Review for ${oid}`);
    const body    = encodeURIComponent(`My rating: ${"⭐".repeat(n)} (${n}/5)\nComments: `);
    const bg      = n === 5 ? C.green : C.white;
    const border  = n === 5 ? C.green : C.border;
    return `<td style="padding:0 3px">
      <a href="mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}"
         style="display:inline-block;background:${bg};border:1px solid ${border};border-radius:8px;padding:9px 12px;font-size:18px;text-decoration:none;line-height:1">${stars}</a>
    </td>`;
  }).join("");

  return wrap(
    cardHeader("&#127800;", "Your Order Has Arrived!", "We hope you love it"),
    `${orderLabel(order.id as string)}

    <p style="margin:0 0 20px;font-size:15px;color:${C.text};line-height:1.7;font-family:Arial,sans-serif">
      Your order has been delivered! We hope your pieces bring you as much joy as we put into crafting them.
      Each one is a little piece of nature, preserved with love. &#127807;
    </p>

    <!-- Items recap -->
    <p style="margin:0 0 8px;font-size:11px;font-family:Arial,sans-serif;letter-spacing:0.15em;text-transform:uppercase;color:${C.muted};border-bottom:2px solid ${C.border};padding-bottom:8px">What you received</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
      ${itemsRows(items)}
    </table>

    <!-- Review section -->
    <div style="background:${C.bg};border-radius:14px;padding:28px 24px;text-align:center">
      <p style="margin:0 0 6px;font-size:19px;font-family:Georgia,'Times New Roman',serif;font-style:italic;color:${C.text}">
        How was your experience?
      </p>
      <p style="margin:0 0 20px;font-size:13px;color:${C.muted};font-family:Arial,sans-serif;line-height:1.6">
        Your feedback means the world to us. Tap a star to send us a quick review!
      </p>

      <table align="center" cellpadding="0" cellspacing="0">
        <tr>${starRow}</tr>
      </table>

      <p style="margin:18px 0 0;font-size:12px;color:${C.muted};font-family:Arial,sans-serif">
        Or write to us at
        <a href="mailto:${ADMIN_EMAIL}" style="color:${C.green};text-decoration:none">${ADMIN_EMAIL}</a>
      </p>
    </div>

    ${ctaButton("Shop Again &rarr;", `${SITE_URL}/shop`)}`
  );
}

function welcomeEmail(name: string) {
  const greeting = name ? `Hello, <strong>${name}</strong>!` : "Hello there!";
  return wrap(
    cardHeader("&#127807;", "Welcome to Earthly Trinkets!", "Your journey with handcrafted resin art begins here"),
    `<p style="margin:0 0 20px;font-size:15px;color:${C.text};line-height:1.7;font-family:Arial,sans-serif">
      ${greeting} &#128075;
    </p>

    <p style="margin:0 0 24px;font-size:15px;color:${C.text};line-height:1.7;font-family:Arial,sans-serif">
      We're so glad you're here. Every piece we create captures nature's fleeting beauty &mdash;
      pressed flowers, delicate leaves, and earth's treasures, preserved forever in crystal-clear resin.
    </p>

    <!-- Features -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr>
        <td style="padding:13px 16px;background:${C.bg};border-radius:10px">
          <p style="margin:0;font-size:14px;font-family:Arial,sans-serif;color:${C.text}">
            &#127800; <strong>Handcrafted</strong> &mdash; Every piece made with care by our artisans
          </p>
        </td>
      </tr>
      <tr><td style="height:8px"></td></tr>
      <tr>
        <td style="padding:13px 16px;background:${C.bg};border-radius:10px">
          <p style="margin:0;font-size:14px;font-family:Arial,sans-serif;color:${C.text}">
            &#127807; <strong>Natural Materials</strong> &mdash; Real botanicals, sustainably sourced
          </p>
        </td>
      </tr>
      <tr><td style="height:8px"></td></tr>
      <tr>
        <td style="padding:13px 16px;background:${C.bg};border-radius:10px">
          <p style="margin:0;font-size:14px;font-family:Arial,sans-serif;color:${C.text}">
            &#127873; <strong>Custom Orders</strong> &mdash; Have something special in mind? We'll make it!
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton("Explore Our Collection &rarr;", `${SITE_URL}/shop`)}`
  );
}

// ─── Admin notification ───────────────────────────────────────────────────────

function adminNewOrderEmail(order: Order, custEmail: string) {
  const items = order.order_items as Item[];
  const addr  = order.shipping_address as Addr;
  const oid   = orderId8(order.id as string);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#e8e8e8;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden" cellpadding="0" cellspacing="0">
        <tr><td style="background:${C.green};padding:22px 32px">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.15em;text-transform:uppercase">&#128722; New Order Received</p>
          <h2 style="margin:4px 0 0;color:#fff;font-size:22px;font-weight:700">${oid} &mdash; &#8377;${order.total}</h2>
        </td></tr>
        <tr><td style="padding:28px 32px">

          <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em">Customer</p>
          <p style="margin:0 0 18px;font-size:14px;color:#222">${addr.full_name} &middot; ${addr.phone} &middot; ${custEmail}</p>

          <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em">Address</p>
          <p style="margin:0 0 18px;font-size:14px;color:#444;line-height:1.6">
            ${addr.line1}${addr.line2 ? `, ${addr.line2}` : ""}, ${addr.city}, ${addr.state} &ndash; ${addr.pincode}
          </p>

          <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em">Payment</p>
          <p style="margin:0 0 18px;font-size:14px;color:#444">
            ${order.payment_method === "cod" ? "&#128181; Cash on Delivery" : "&#10003; Paid Online (Razorpay)"}
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td colspan="2" style="padding-bottom:8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #eee">Items</td></tr>
            ${itemsRows(items)}
            <tr>
              <td style="padding:12px 0 0;font-size:15px;font-weight:700;color:#222">Total</td>
              <td style="padding:12px 0 0;font-size:15px;font-weight:700;color:#222;text-align:right">&#8377;${order.total}</td>
            </tr>
          </table>

          <div style="margin-top:24px;text-align:center">
            <a href="${SITE_URL}/admin/orders" style="display:inline-block;background:${C.green};color:#fff;text-decoration:none;padding:11px 28px;border-radius:50px;font-size:13px;font-weight:700">
              View in Admin Panel &rarr;
            </a>
          </div>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
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
  if (!res.ok) console.error("Resend error:", await res.text());
}

// ─── Event routing ────────────────────────────────────────────────────────────

type EventConfig = { subject: (oid: string) => string; template: (o: Order) => string };

const EVENTS: Record<string, EventConfig> = {
  order_placed: {
    subject: (id) => `Order Placed \u2013 ${id} | Earthly Trinkets`,
    template: orderPlacedEmail,
  },
  order_confirmed: {
    subject: (id) => `\u2705 Order Confirmed \u2013 ${id} | Earthly Trinkets`,
    template: orderConfirmedEmail,
  },
  order_shipped: {
    subject: (id) => `\u{1F4E6} Your Order is On Its Way! \u2013 ${id} | Earthly Trinkets`,
    template: orderShippedEmail,
  },
  order_out_for_delivery: {
    subject: (id) => `\u{1F69A} Arriving Today! \u2013 ${id} | Earthly Trinkets`,
    template: orderOutForDeliveryEmail,
  },
  order_delivered: {
    subject: (id) => `\u{1F338} Delivered! How did we do? \u2013 ${id} | Earthly Trinkets`,
    template: orderDeliveredEmail,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" },
    });
  }

  try {
    const body = await req.json();
    const { event, orderId, name, email: directEmail } = body;

    // ── Welcome email (no order needed) ──
    if (event === "welcome") {
      if (!directEmail) throw new Error("email required for welcome event");
      await sendEmail(directEmail, "Welcome to Earthly Trinkets! \u{1F33F}", welcomeEmail(name ?? ""));
      return new Response(JSON.stringify({ success: true }), { headers: CORS });
    }

    // ── Order status emails ──
    const cfg = EVENTS[event];
    if (!cfg) throw new Error(`Unknown event: ${event}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();
    if (error || !order) throw new Error("Order not found");

    const { data: { user } } = await supabase.auth.admin.getUserById(order.user_id);
    const custEmail = user?.email ?? "";
    const oid = orderId8(order.id as string);

    const tasks: Promise<void>[] = [];

    if (custEmail) {
      tasks.push(sendEmail(custEmail, cfg.subject(oid), cfg.template(order)));
    }

    // Admin notification only on new order
    if (event === "order_placed") {
      tasks.push(sendEmail(
        ADMIN_EMAIL,
        `New Order ${oid} \u2013 \u20B9${order.total} (${order.payment_method === "cod" ? "COD" : "Paid"})`,
        adminNewOrderEmail(order, custEmail),
      ));
    }

    await Promise.all(tasks);
    return new Response(JSON.stringify({ success: true }), { headers: CORS });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});
