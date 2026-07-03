import { createClient } from "@supabase/supabase-js";
import type { Database } from "@siteops/shared/database.types";

// Service-role client: bypasses RLS. Never expose outside the worker.
export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
