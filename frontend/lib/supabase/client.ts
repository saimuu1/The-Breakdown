import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";

/** Browser-side Supabase client. Reads are governed by RLS using the user's JWT. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
