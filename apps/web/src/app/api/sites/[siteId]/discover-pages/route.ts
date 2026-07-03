import { NextResponse } from "next/server";
import { requireOrg, isGuardResponse } from "@/lib/auth-guards";
import { discoverPagesFromSitemap } from "@/lib/sitemap";

type Params = { params: Promise<{ siteId: string }> };

// POST /api/sites/:id/discover-pages — synchronous sitemap discovery
// (FR-004). Returns the list; does not persist.
export async function POST(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { siteId } = await params;

  const { data: site } = await ctx.supabase
    .from("sites")
    .select("id, url")
    .eq("id", siteId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const result = await discoverPagesFromSitemap(site.url);
  return NextResponse.json(
    {
      discovered: result.pages.map((p) => ({ url: p.url, source: "sitemap" })),
      source: result.source,
      truncated: result.truncated,
    },
    { status: 202 }
  );
}
