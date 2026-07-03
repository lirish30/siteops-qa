import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@siteops/shared/database.types";

// Service-role client for server-only jobs the user's session can't do
// (signing private-storage URLs). Never import from client components —
// callers must run their own auth/org checks first (use requireOrg).
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
