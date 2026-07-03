import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/features/nav/TopNav";

// Org gate + app chrome for all main app screens.
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding/org");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav email={user.email ?? ""} />
      <div className="mx-auto w-full max-w-[1280px] flex-1 p-5">{children}</div>
    </div>
  );
}
