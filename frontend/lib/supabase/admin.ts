import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

/**
 * Service-role Supabase client — bypasses RLS. SERVER ONLY.
 *
 * Used exclusively by trusted server code that has no user session, namely the
 * Stripe webhook, which must set `profiles.plan` after a payment. The service
 * role key must never reach the browser: it lives in SUPABASE_SERVICE_ROLE_KEY
 * (no NEXT_PUBLIC_ prefix), so Next.js will refuse to bundle it client-side.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase admin client needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
