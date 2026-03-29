// @ts-nocheck
// Supabase Edge Function — Newsletter Notifications
//
// Deploy: supabase functions deploy send-newsletter --no-verify-jwt --project-ref abymyaohtxrbaiiyoyak
//
// Request body: { type: "new_product" | "price_drop", productId: string, customMessage?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "hello@earthlytrinkets.in";
const SITE_URL = "https://www.earthlytrinkets.in";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const C = {
  green:  "#4a7c59",
  bg:     "#f5f0eb",
  white:  "#ffffff",
  text:   "#2d2015",
  muted:  "#8a7a6a",
  border: "#e8e0d5",
  accent: "#c96b4a",
};

// ─── Email helpers ────────────────────────────────────────────────────────────

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

function ctaButton(text: string, url: string) {
  return `
    <div style="text-align:center;margin-top:28px">
      <a href="${url}" style="display:inline-block;background:${C.green};color:${C.white};text-decoration:none;padding:13px 32px;border-radius:50px;font-size:13px;font-family:Arial,sans-serif;font-weight:700;letter-spacing:0.04em">
        ${text}
      </a>
    </div>`;
}

function buildEmail(headerRow: string, bodyContent: string, unsubEmail: string) {
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

      <table width="100%" style="max-width:580px;background:${C.white};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(45,32,21,0.07)" cellpadding="0" cellspacing="0">
        ${headerRow}
        <tr><td style="padding:36px 40px">
          ${bodyContent}
        </td></tr>
        <tr><td style="padding:24px 40px 28px;text-align:center;border-top:1px solid ${C.border}">
          <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:15px;color:${C.text}">
            <span style="color:${C.green}">Earthly</span> Trinkets
          </p>
          <p style="margin:0 0 10px;font-size:12px;color:${C.muted};font-family:Arial,sans-serif;line-height:1.8">
            &copy; 2026 Earthly Trinkets &middot; Made with &hearts; in India
          </p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#b8a898">
            You're receiving this because you subscribed to Earthly Trinkets updates.<br>
            <a href="https://abymyaohtxrbaiiyoyak.supabase.co/functions/v1/unsubscribe?email=${encodeURIComponent(unsubEmail)}" style="color:${C.muted};text-decoration:underline">Unsubscribe</a>
          </p>
        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

function cardHeader(icon: string, title: string, subtitle?: string) {
  return `
    <tr><td style="background:${C.green};padding:36px 40px;text-align:center">
      <div style="display:inline-block;width:60px;height:60px;background:rgba(255,255,255,0.15);border-radius:50%;line-height:60px;font-size:28px;margin-bottom:16px;text-align:center">${icon}</div>
      <h1 style="margin:0;color:${C.white};font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;font-style:italic;line-height:1.3">${title}</h1>
      ${subtitle ? `<p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-family:Arial,sans-serif;font-size:13px">${subtitle}</p>` : ""}
    </td></tr>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const unsubUrl = `https://abymyaohtxrbaiiyoyak.supabase.co/functions/v1/unsubscribe?email=${encodeURIComponent(to)}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Earthly Trinkets <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Resend error:", res.status, body);
    throw new Error(`Resend failed (${res.status})`);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { type, productId, customMessage } = await req.json();

    if (!type || !productId) {
      return new Response(JSON.stringify({ error: "type and productId required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch product
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    if (prodErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch active subscribers
    const { data: subscribers, error: subErr } = await supabase
      .from("subscribers")
      .select("email")
      .eq("status", "active");
    if (subErr) throw subErr;
    if (!subscribers?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: "No active subscribers" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Build email based on type
    const productUrl = `${SITE_URL}/product/${product.slug}`;
    const imageUrl = product.images?.[0] ?? null;

    let subject: string;
    let headerRow: string;
    let bodyContent: string;

    if (type === "new_product") {
      subject = `New Arrival: ${product.name}`;
      headerRow = cardHeader("&#10024;", "New Arrival!", "Something special just landed");
      bodyContent = `
        ${imageUrl ? `<div style="text-align:center;margin-bottom:24px"><img src="${imageUrl}" alt="${product.name}" style="max-width:100%;height:auto;border-radius:12px;max-height:300px;object-fit:cover"></div>` : ""}
        <h2 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${C.text};text-align:center">${product.name}</h2>
        ${product.short_description ? `<p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;color:${C.muted};text-align:center;line-height:1.6">${product.short_description}</p>` : ""}
        <p style="margin:0;text-align:center;font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:${C.green}">Rs. ${product.price}</p>
        ${customMessage ? `<p style="margin:20px 0 0;font-family:Arial,sans-serif;font-size:14px;color:${C.text};text-align:center;font-style:italic;line-height:1.6">"${customMessage}"</p>` : ""}
        ${ctaButton("Shop Now &rarr;", productUrl)}
      `;
    } else {
      const oldPrice = product.compare_at_price ?? product.price;
      const savings = oldPrice - product.price;
      subject = `Price Drop: ${product.name} now Rs. ${product.price}`;
      headerRow = cardHeader("&#128181;", "Price Drop!", "Your favourites just got better");
      bodyContent = `
        ${imageUrl ? `<div style="text-align:center;margin-bottom:24px"><img src="${imageUrl}" alt="${product.name}" style="max-width:100%;height:auto;border-radius:12px;max-height:300px;object-fit:cover"></div>` : ""}
        <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${C.text};text-align:center">${product.name}</h2>
        <div style="text-align:center;margin-bottom:8px">
          <span style="font-family:Arial,sans-serif;font-size:16px;color:${C.muted};text-decoration:line-through">Rs. ${oldPrice}</span>
          <span style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:${C.green};margin-left:12px">Rs. ${product.price}</span>
        </div>
        ${savings > 0 ? `<p style="margin:0;text-align:center;font-family:Arial,sans-serif;font-size:14px;color:${C.accent};font-weight:600">You save Rs. ${savings}!</p>` : ""}
        ${customMessage ? `<p style="margin:20px 0 0;font-family:Arial,sans-serif;font-size:14px;color:${C.text};text-align:center;font-style:italic;line-height:1.6">"${customMessage}"</p>` : ""}
        ${ctaButton("Grab the Deal &rarr;", productUrl)}
      `;
    }

    // Send emails in batches of 10
    let sent = 0;
    const BATCH_SIZE = 10;
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((sub) => sendEmail(sub.email, subject, buildEmail(headerRow, bodyContent, sub.email)))
      );
      sent += results.filter((r) => r.status === "fulfilled").length;
    }

    console.log(`Newsletter sent: ${sent}/${subscribers.length} emails for product ${product.name}`);

    return new Response(JSON.stringify({ ok: true, sent, total: subscribers.length }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Newsletter error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
