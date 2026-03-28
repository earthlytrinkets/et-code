// @ts-nocheck
// Supabase Edge Function — Shiprocket API proxy
// Avoids CORS by proxying calls server-side.
//
// Deploy: supabase functions deploy shiprocket --project-ref abymyaohtxrbaiiyoyak
//
// Required secrets for auto-auth (tracking):
//   SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD
//
// Expected request body: { action: string, ...payload }
// Supported actions:
//   "login"        → { email, password }
//   "create_order" → { token, order: ShiprocketOrderPayload }
//   "assign_awb"   → { token, shipment_id }
//   "track"        → { awb }  (auto-authenticates server-side)

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

// Auto-login using server-side credentials (for actions that don't have a client token)
async function getServerToken(): Promise<string | null> {
  const email = Deno.env.get("SHIPROCKET_EMAIL");
  const password = Deno.env.get("SHIPROCKET_PASSWORD");
  if (!email || !password) return null;

  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data?.token ?? null;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const { action, ...payload } = body;

    let srUrl = "";
    let srBody: unknown = undefined;
    let token: string | undefined = payload.token;

    if (action === "login") {
      srUrl = `${SHIPROCKET_BASE}/auth/login`;
      srBody = { email: payload.email, password: payload.password };
      token = undefined; // no auth header for login
    } else if (action === "create_order") {
      srUrl = `${SHIPROCKET_BASE}/orders/create/adhoc`;
      srBody = payload.order;
    } else if (action === "assign_awb") {
      srUrl = `${SHIPROCKET_BASE}/courier/assign/awb`;
      srBody = { shipment_id: payload.shipment_id };
    } else if (action === "get_order") {
      srUrl = `${SHIPROCKET_BASE}/orders/show/${payload.sr_order_id}`;
      srBody = undefined; // GET request
      if (!token) {
        token = await getServerToken() ?? undefined;
      }
    } else if (action === "track") {
      srUrl = `${SHIPROCKET_BASE}/courier/track/awb/${payload.awb}`;
      srBody = undefined; // GET request
      // Auto-auth for tracking (users don't have a Shiprocket token)
      if (!token) {
        token = await getServerToken() ?? undefined;
      }
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const srRes = await fetch(srUrl, {
      method: srBody !== undefined ? "POST" : "GET",
      headers,
      body: srBody !== undefined ? JSON.stringify(srBody) : undefined,
    });

    const data = await srRes.json();
    return new Response(JSON.stringify(data), {
      status: srRes.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
