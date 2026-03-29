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

  // Redirect to the site with unsubscribed flag — the frontend shows the confirmation
  return new Response(null, {
    status: 302,
    headers: { Location: "https://www.earthlytrinkets.in/unsubscribed" },
  });
});
