// Supabase Edge Function — Shiprocket Webhook Receiver
//
// Shiprocket sends POST requests here whenever a shipment status changes.
// This function updates the corresponding order in the DB and triggers
// email notifications.
//
// Deploy: supabase functions deploy shiprocket-webhook --no-verify-jwt --project-ref abymyaohtxrbaiiyoyak
//
// Configure in Shiprocket:
//   Settings → Webhooks → Add Webhook
//   URL: https://abymyaohtxrbaiiyoyak.supabase.co/functions/v1/shiprocket-webhook
//   Events: All shipment status updates

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Shiprocket's current_status to our order_status enum.
// Reference: https://apidocs.shiprocket.in/#b54833c2-7dbc-4a09-b8a0-dcb6737b8fd5
const SR_STATUS_MAP: Record<string, string> = {
  // Pickup
  "6":  "processing",     // Shipped — Pickup Scheduled
  "7":  "processing",     // Shipped — Pickup Error
  "42": "processing",     // Shipped — Pickup Rescheduled

  // In Transit
  "18": "shipped",        // Shipped — In Transit
  "38": "shipped",        // Shipped — Reached at Destination Hub
  "48": "shipped",        // Shipped — In Transit — Shipment Out for Delivery

  // Out for Delivery
  "17": "out_for_delivery", // Shipped — Out for Delivery

  // Delivered
  "8":  "delivered",      // Shipped — Delivered

  // RTO / Cancelled
  "9":  "cancelled",      // Shipped — Undelivered
  "14": "cancelled",      // RTO Initiated
  "15": "cancelled",      // RTO Delivered
  "16": "cancelled",      // Cancelled by Shiprocket
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Verify webhook token — Shiprocket sends it as x-api-key header
  const webhookSecret = Deno.env.get("SHIPROCKET_WEBHOOK_SECRET");
  const token = req.headers.get("x-api-key") ?? req.headers.get("x-api-token") ?? new URL(req.url).searchParams.get("token");
  if (webhookSecret && token !== webhookSecret) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const payload = await req.json();
    console.log("Shiprocket webhook payload:", JSON.stringify(payload));

    // Shiprocket webhook payload shape:
    // { order_id, sr_order_id, current_status, current_status_id, awb, courier_name, ... }
    const srOrderId = String(payload.sr_order_id ?? payload.order_id ?? "");
    const statusId = String(payload.current_status_id ?? "");
    const awb = payload.awb ?? null;
    const courierName = payload.courier_name ?? null;

    if (!srOrderId) {
      return new Response(JSON.stringify({ error: "Missing order ID" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Find the order in our DB by shiprocket_order_id
    const { data: order, error: findErr } = await supabase
      .from("orders")
      .select("id, status, shiprocket_awb")
      .eq("shiprocket_order_id", srOrderId)
      .maybeSingle();

    if (findErr || !order) {
      console.error("Order not found for Shiprocket order:", srOrderId, findErr);
      // Return 200 so Shiprocket doesn't retry
      return new Response(JSON.stringify({ ok: true, skipped: "order not found" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Map Shiprocket status to our status
    const newStatus = SR_STATUS_MAP[statusId];
    if (!newStatus) {
      console.log("Unmapped Shiprocket status_id:", statusId, "current_status:", payload.current_status);
      return new Response(JSON.stringify({ ok: true, skipped: "unmapped status" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Don't move backwards (e.g. don't go from delivered back to shipped)
    const STATUS_ORDER = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered"];
    const currentIdx = STATUS_ORDER.indexOf(order.status);
    const newIdx = STATUS_ORDER.indexOf(newStatus);
    if (newIdx >= 0 && currentIdx >= 0 && newIdx <= currentIdx && newStatus !== "cancelled") {
      console.log(`Skipping: current ${order.status} (${currentIdx}) >= new ${newStatus} (${newIdx})`);
      return new Response(JSON.stringify({ ok: true, skipped: "status not advancing" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Build update
    const update: Record<string, unknown> = { status: newStatus };
    if (awb && !order.shiprocket_awb) {
      update.shiprocket_awb = awb;
    }

    const { error: updateErr } = await supabase
      .from("orders")
      .update(update)
      .eq("id", order.id);

    if (updateErr) {
      console.error("Failed to update order:", updateErr);
      return new Response(JSON.stringify({ error: "DB update failed" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Trigger email notification
    const STATUS_EMAIL_EVENT: Record<string, string> = {
      shipped: "order_shipped",
      out_for_delivery: "order_out_for_delivery",
      delivered: "order_delivered",
      cancelled: "order_cancelled",
    };
    const emailEvent = STATUS_EMAIL_EVENT[newStatus];
    if (emailEvent) {
      await supabase.functions.invoke("send-order-email", {
        body: { event: emailEvent, orderId: order.id },
      }).catch((e: unknown) => console.error("Email send failed:", e));
    }

    console.log(`Order ${order.id} updated: ${order.status} → ${newStatus}${awb ? ` (AWB: ${awb})` : ""}`);

    return new Response(JSON.stringify({ ok: true, orderId: order.id, status: newStatus }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
