/**
 * Supabase Admin Client
 *
 * This client uses the SERVICE ROLE key, which bypasses all RLS policies.
 * Think of this like a Spring @Repository that connects with elevated DB privileges.
 *
 * IMPORTANT: Never expose this key to the browser. It lives only on the server.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default supabaseAdmin;
