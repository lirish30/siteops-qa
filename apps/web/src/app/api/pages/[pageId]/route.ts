import { NextResponse } from "next/server";
import { patchPageSchema } from "@siteops/shared";
import { requireOrg, isGuardResponse } from "@/lib/auth-guards";

type Params = { params: Promise<{ pageId: string }> };

// PATCH /api/pages/:id — save ignored regions (TASK-033). Regions are stored
// in natural-image pixel coordinates and applied during visual diff (Phase 3).
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { supabase, orgId } = ctx;
  const { pageId } = await params;

  const parsed = patchPageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data: page } = await supabase
    .from("monitored_pages")
    .select("id, sites!inner ( org_id )")
    .eq("id", pageId)
    .eq("sites.org_id", orgId)
    .maybeSingle();
  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("monitored_pages")
    .update({ ignored_regions: parsed.data.ignoredRegions })
    .eq("id", pageId);
  if (error) {
    return NextResponse.json(
      { error: "We couldn't save those regions. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ignoredRegions: parsed.data.ignoredRegions });
}
