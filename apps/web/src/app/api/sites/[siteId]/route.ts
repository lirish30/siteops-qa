import { NextResponse } from "next/server";
import { updateSiteSchema } from "@siteops/shared";
import { requireOrg, isGuardResponse } from "@/lib/auth-guards";

type Params = { params: Promise<{ siteId: string }> };

// GET /api/sites/:id — site + pages + current baseline status.
export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { siteId } = await params;

  const { data: site } = await ctx.supabase
    .from("sites")
    .select(
      "id, url, name, wp_detection, wp_signals, status, last_scan_at, monitored_pages ( id, url, label, page_type, importance, is_active )"
    )
    .eq("id", siteId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: site.id,
    url: site.url,
    name: site.name,
    wpDetection: site.wp_detection,
    wpSignals: site.wp_signals,
    status: site.status,
    lastScanAt: site.last_scan_at,
    pages: site.monitored_pages.filter((p) => p.is_active),
  });
}

// PATCH /api/sites/:id — rename / archive.
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { siteId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data: site, error } = await ctx.supabase
    .from("sites")
    .update(parsed.data)
    .eq("id", siteId)
    .eq("org_id", ctx.orgId)
    .select("id, url, name, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "We couldn't update that site. Try again." },
      { status: 500 }
    );
  }
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }
  return NextResponse.json(site);
}

// DELETE /api/sites/:id — cascades to pages/baselines/scans via FKs.
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { siteId } = await params;

  const { data: deleted, error } = await ctx.supabase
    .from("sites")
    .delete()
    .eq("id", siteId)
    .eq("org_id", ctx.orgId)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "We couldn't delete that site. Try again." },
      { status: 500 }
    );
  }
  if (!deleted?.length) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
