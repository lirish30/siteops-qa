import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@siteops/shared/database.types";
import { createClient } from "@/lib/supabase/server";

export interface OrgContext {
  supabase: SupabaseClient<Database>;
  userId: string;
  orgId: string;
  role: string;
  plan: string;
}

/**
 * Session + org membership guard for API route handlers. Returns the caller's
 * org context, or a ready-to-return NextResponse (401 without a session,
 * 403 without an org). RLS still applies underneath — this exists for clear
 * status codes and to hand routes the orgId/plan.
 */
export async function requireOrg(): Promise<OrgContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations ( plan )")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "You need an organization first." },
      { status: 403 }
    );
  }

  return {
    supabase,
    userId: user.id,
    orgId: membership.org_id,
    role: membership.role,
    plan: membership.organizations?.plan ?? "trial",
  };
}

export function isGuardResponse(
  ctx: OrgContext | NextResponse
): ctx is NextResponse {
  return ctx instanceof NextResponse;
}
