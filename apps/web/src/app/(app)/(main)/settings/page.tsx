import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createOrgSchema } from "@siteops/shared";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Settings — SiteOps QA" };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function updateProfile(formData: FormData) {
  "use server";
  const { supabase, user } = await requireUser();
  const fullName = String(formData.get("full_name") ?? "")
    .trim()
    .slice(0, 120);
  await supabase.from("profiles").update({ full_name: fullName || null }).eq("id", user.id);
  revalidatePath("/settings");
}

async function updateOrg(formData: FormData) {
  "use server";
  const { supabase, user } = await requireUser();
  const parsed = createOrgSchema.safeParse({ name: formData.get("org_name") });
  if (!parsed.success) return;
  // Org id comes from the user's own membership, never from the form.
  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return;
  await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", membership.org_id);
  revalidatePath("/settings");
}

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
    supabase
      .from("organization_members")
      .select("org_id, organizations(id, name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
  ]);
  const org = membership?.organizations;

  return (
    <main className="flex max-w-xl flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-on-surface-secondary">{profile?.email}</p>
        <form action={updateProfile} className="flex items-end gap-3">
          <div className="flex-1">
            <Input label="Full name" name="full_name" defaultValue={profile?.full_name ?? ""} />
          </div>
          <Button type="submit" variant="secondary">
            Save
          </Button>
        </form>
      </Card>

      {org && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Organization</h2>
          <form action={updateOrg} className="flex items-end gap-3">
            <div className="flex-1">
              <Input label="Organization name" name="org_name" defaultValue={org.name} required />
            </div>
            <Button type="submit" variant="secondary">
              Save
            </Button>
          </form>
        </Card>
      )}

      <Card className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Session</h2>
          <p className="text-sm text-on-surface-secondary">Sign out of SiteOps QA on this device.</p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </Card>
    </main>
  );
}
