// @ts-nocheck
// Supabase Edge Function — Unsubscribe from newsletter
//
// Deploy: supabase functions deploy unsubscribe --no-verify-jwt --project-ref abymyaohtxrbaiiyoyak
//
// GET /functions/v1/unsubscribe?email=user@example.com

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (email) {
    await supabase
      .from("subscribers")
      .update({ status: "unsubscribed" })
      .eq("email", email);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed — Earthly Trinkets</title>
  <style>
    body { margin:0; padding:40px 20px; background:#f5f0eb; font-family:Arial,sans-serif; text-align:center; color:#2d2015; }
    .card { max-width:460px; margin:60px auto; background:#fff; border-radius:16px; padding:48px 32px; box-shadow:0 4px 24px rgba(45,32,21,0.07); }
    .logo { font-family:Georgia,'Times New Roman',serif; font-style:italic; font-size:24px; margin-bottom:24px; }
    .logo span { color:#4a7c59; }
    h1 { font-size:20px; margin:0 0 12px; }
    p { font-size:14px; color:#8a7a6a; line-height:1.6; margin:0; }
    a { display:inline-block; margin-top:24px; background:#4a7c59; color:#fff; text-decoration:none; padding:12px 28px; border-radius:50px; font-size:13px; font-weight:700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo"><span>Earthly</span> Trinkets</div>
    <h1>You've been unsubscribed</h1>
    <p>We're sorry to see you go. You won't receive any more newsletter emails from us.</p>
    <a href="https://www.earthlytrinkets.in">Visit Our Store</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
