// @ts-nocheck
// Supabase Edge Function — Razorpay Invoice Generator
//
// Creates a Razorpay invoice for every order (prepaid and COD).
// - Prepaid (Razorpay): invoice created as already "paid"
// - COD: invoice created as "issued" (unpaid) — marked paid on delivery
//
// Deploy: supabase functions deploy create-invoice --project-ref abymyaohtxrbaiiyoyak
//
// Required secrets:
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
//
// Called from: send-order-email (on order_placed event)
// Also called from: shipping-hook (to mark COD invoice paid on delivery)
//
// Request body:
//   { action: "create", orderId: string }
//   { action: "mark_paid", orderId: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const RAZORPAY_BASE = "https://api.razorpay.com/v1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function razorpayHeaders() {
  const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderItem = {
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
};

type ShippingAddr = {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
};

// ─── Create Invoice ──────────────────────────────────────────────────────────

async function createInvoice(orderId: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch order with items
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    console.error("Order not found:", orderId, orderErr);
    return json({ error: "Order not found" }, 404);
  }

  // Skip if invoice already exists
  if (order.razorpay_invoice_id) {
    console.log("Invoice already exists for order:", orderId, order.razorpay_invoice_id);
    return json({ ok: true, invoice_id: order.razorpay_invoice_id, skipped: true });
  }

  // Fetch customer email
  const { data: { user } } = await supabase.auth.admin.getUserById(order.user_id);
  const custEmail = user?.email ?? "";
  const addr = order.shipping_address as ShippingAddr;
  const items = order.order_items as OrderItem[];

  // Build Razorpay line items (amounts in paise)
  const lineItems = items.map((item) => ({
    name: item.product_name,
    quantity: item.quantity,
    amount: Math.round(item.price * 100), // per-unit price in paise
    currency: "INR",
  }));

  // Add shipping fee as a line item if present
  if (order.shipping_fee > 0) {
    lineItems.push({
      name: "Shipping Fee",
      quantity: 1,
      amount: Math.round(order.shipping_fee * 100),
      currency: "INR",
    });
  }

  // Add discount as a negative line item if present
  if (order.discount_amount > 0) {
    lineItems.push({
      name: `Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`,
      quantity: 1,
      amount: -Math.round(order.discount_amount * 100),
      currency: "INR",
    });
  }

  const oid = `#${order.id.slice(0, 8).toUpperCase()}`;
  const isPrepaid = order.payment_method === "razorpay";

  // Build invoice payload
  const invoicePayload: Record<string, unknown> = {
    type: "invoice",
    description: `Order ${oid} — Earthly Trinkets`,
    customer: {
      name: addr.full_name,
      email: custEmail || undefined,
      contact: addr.phone || undefined,
      billing_address: {
        line1: addr.line1,
        line2: addr.line2 || undefined,
        city: addr.city,
        state: addr.state,
        zipcode: addr.pincode,
        country: addr.country || "India",
      },
      shipping_address: {
        line1: addr.line1,
        line2: addr.line2 || undefined,
        city: addr.city,
        state: addr.state,
        zipcode: addr.pincode,
        country: addr.country || "India",
      },
    },
    line_items: lineItems,
    currency: "INR",
    sms_notify: 0,    // we send our own SMS
    email_notify: 1,  // Razorpay sends invoice to customer email
    receipt: order.id.slice(0, 40), // max 40 chars
    notes: {
      order_id: order.id,
      payment_method: order.payment_method,
    },
  };

  // Prepaid: link the existing Razorpay order_id so the invoice auto-marks as paid.
  //          Customer gets an invoice email showing "Paid".
  // COD:     created as issued — customer gets invoice email with payment pending.
  //          Cancelled when order is delivered (payment collected offline).
  if (isPrepaid && order.razorpay_order_id) {
    invoicePayload.order_id = order.razorpay_order_id;
  }

  console.log("Creating Razorpay invoice for order:", oid, "method:", order.payment_method);

  const res = await fetch(`${RAZORPAY_BASE}/invoices`, {
    method: "POST",
    headers: razorpayHeaders(),
    body: JSON.stringify(invoicePayload),
  });

  const invoice = await res.json();

  if (!res.ok) {
    console.error("Razorpay invoice creation failed:", res.status, JSON.stringify(invoice));
    return json({ error: "Razorpay API error", details: invoice }, 500);
  }

  console.log("Razorpay invoice created:", invoice.id, "status:", invoice.status);

  // Save invoice ID to our order
  await supabase
    .from("orders")
    .update({ razorpay_invoice_id: invoice.id })
    .eq("id", orderId);

  return json({
    ok: true,
    invoice_id: invoice.id,
    short_url: invoice.short_url,
    status: invoice.status,
  });
}

// ─── Mark Invoice Paid (for COD on delivery) ────────────────────────────────

async function markInvoicePaid(orderId: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: order, error } = await supabase
    .from("orders")
    .select("razorpay_invoice_id, payment_method")
    .eq("id", orderId)
    .single();

  if (error || !order?.razorpay_invoice_id) {
    console.log("No invoice to mark paid for order:", orderId);
    return json({ ok: true, skipped: "no invoice" });
  }

  // Only mark COD invoices as paid — prepaid invoices are handled by Razorpay
  if (order.payment_method !== "cod") {
    console.log("Not a COD order, skipping mark_paid:", orderId);
    return json({ ok: true, skipped: "not COD" });
  }

  console.log("Cancelling COD invoice (delivered, payment collected):", order.razorpay_invoice_id);

  // Razorpay doesn't have a direct "mark paid" for invoices without a payment.
  // For COD, the best approach is to cancel the invoice (payment collected offline).
  // This updates the invoice status to "cancelled" with a note.
  const res = await fetch(`${RAZORPAY_BASE}/invoices/${order.razorpay_invoice_id}/cancel`, {
    method: "POST",
    headers: razorpayHeaders(),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Failed to cancel COD invoice:", res.status, body);
    return json({ error: "Failed to update invoice" }, 500);
  }

  console.log("COD invoice cancelled (payment collected offline):", order.razorpay_invoice_id);
  return json({ ok: true, invoice_id: order.razorpay_invoice_id, status: "cancelled" });
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { action, orderId } = await req.json();

    if (!orderId) return json({ error: "orderId required" }, 400);

    if (action === "create") {
      return await createInvoice(orderId);
    } else if (action === "mark_paid") {
      return await markInvoicePaid(orderId);
    } else {
      return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("Invoice function error:", err);
    return json({ error: String(err) }, 500);
  }
});
