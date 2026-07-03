import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Auth gate for everything in (app). The org gate lives one level down in
// (main) so /onboarding/org doesn't redirect to itself.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
