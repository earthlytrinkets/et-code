# Earthly Trinkets — Edge Functions Reference

Edge functions are server-side code running on Supabase (Deno runtime).
They handle tasks that require secrets, external APIs, or elevated DB access.

Project ref: `abymyaohtxrbaiiyoyak`

---

## 1. shiprocket

**Purpose:** API proxy for Shiprocket — avoids CORS by proxying calls server-side.
Supports: login, create_order, assign_awb, get_order, track (auto-authenticates for tracking).

**Secrets required:**
- `SHIPROCKET_EMAIL` — Shiprocket account email (used for auto-auth on tracking)
- `SHIPROCKET_PASSWORD` — Shiprocket account password

**Deploy:**
```bash
supabase functions deploy shiprocket --no-verify-jwt --project-ref abymyaohtxrbaiiyoyak
```

---

## 2. shipping-hook

**Purpose:** Webhook receiver for Shiprocket shipment status updates.
Auto-updates order status and AWB in the DB, sends email notifications, restores stock on cancellation.

**Secrets required:**
- `SHIPROCKET_WEBHOOK_SECRET` — must match the token configured in Shiprocket webhook settings

**Shiprocket webhook URL:**
```
https://abymyaohtxrbaiiyoyak.supabase.co/functions/v1/shipping-hook
```

**Deploy:**
```bash
supabase functions deploy shipping-hook --no-verify-jwt --project-ref abymyaohtxrbaiiyoyak
```

---

## 3. send-order-email

**Purpose:** Sends transactional order emails via Resend API.
Events: order_placed, order_confirmed, order_shipped, order_out_for_delivery, order_delivered, order_cancelled, order_refunded, welcome, password_reset.

**Secrets required:**
- `RESEND_API_KEY` — Resend API key for sending emails

**Deploy:**
```bash
supabase functions deploy send-order-email --project-ref abymyaohtxrbaiiyoyak
```

---

## 4. send-newsletter

**Purpose:** Sends newsletter notifications (new product, price drop) to all active subscribers.

**Secrets required:**
- `RESEND_API_KEY` — Resend API key for sending emails

**Deploy:**
```bash
supabase functions deploy send-newsletter --no-verify-jwt --project-ref abymyaohtxrbaiiyoyak
```

---

## 5. unsubscribe

**Purpose:** Handles one-click unsubscribe from newsletter emails.
GET endpoint that marks the subscriber as unsubscribed and shows a confirmation page.

**Secrets required:** None (uses SUPABASE_SERVICE_ROLE_KEY which is auto-set)

**Deploy:**
```bash
supabase functions deploy unsubscribe --no-verify-jwt --project-ref abymyaohtxrbaiiyoyak
```

---

## Deploy All

```bash
supabase functions deploy shiprocket --no-verify-jwt --project-ref abymyaohtxrbaiiyoyak
supabase functions deploy shipping-hook --no-verify-jwt --project-ref abymyaohtxrbaiiyoyak
supabase functions deploy send-order-email --project-ref abymyaohtxrbaiiyoyak
supabase functions deploy send-newsletter --no-verify-jwt --project-ref abymyaohtxrbaiiyoyak
supabase functions deploy unsubscribe --no-verify-jwt --project-ref abymyaohtxrbaiiyoyak
```

## All Secrets Summary

| Secret | Used by | Source |
|--------|---------|--------|
| `RESEND_API_KEY` | send-order-email, send-newsletter | Resend dashboard |
| `SHIPROCKET_EMAIL` | shiprocket | Shiprocket login email |
| `SHIPROCKET_PASSWORD` | shiprocket | Shiprocket login password |
| `SHIPROCKET_WEBHOOK_SECRET` | shipping-hook | Token set in Shiprocket webhook config |
| `SUPABASE_URL` | all (auto-set) | Auto-provided by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | all (auto-set) | Auto-provided by Supabase |
