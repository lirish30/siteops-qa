import { NextResponse } from "next/server";
import {
  isSameOrigin,
  normalizePageUrl,
  putPagesSchema,
} from "@siteops/shared";
import { requireOrg, isGuardResponse } from "@/lib/auth-guards";
import { planLimitResponse, withinPageLimit } from "@/lib/assert-limits";

type Params = { params: Promise<{ siteId: string }> };

// PUT /api/sites/:id/pages — replace the active monitored-page set (FR-005):
// upsert by (site_id, url), deactivate pages no longer selected.
export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { supabase, orgId, plan } = ctx;
  const { siteId } = await params;

  const { data: site } = await supabase
    .from("sites")
    .select("id, url")
    .eq("id", siteId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = putPagesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Normalize + dedupe, then validate same-origin against the site.
  const seen = new Set<string>();
  const pages: typeof parsed.data.pages = [];
  for (const page of parsed.data.pages) {
    let url: string;
    try {
      url = normalizePageUrl(page.url);
    } catch {
      return NextResponse.json(
        { error: `"${page.url}" isn't a valid URL.` },
        { status: 400 }
      );
    }
    if (!isSameOrigin(url, site.url)) {
      return NextResponse.json(
        { error: `All pages must be on ${site.url}.` },
        { status: 400 }
      );
    }
    if (seen.has(url)) continue;
    seen.add(url);
    pages.push({ ...page, url });
  }

  if (!withinPageLimit(plan, pages.length)) {
    return planLimitResponse(
      "That's more pages than your plan allows. Upgrade to monitor more pages per site."
    );
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("monitored_pages")
    .upsert(
      pages.map((p) => ({
        site_id: siteId,
        url: p.url,
        label: p.label ?? null,
        page_type: p.pageType ?? "other",
        importance: p.importance ?? "normal",
        is_active: true,
      })),
      { onConflict: "site_id,url" }
    )
    .select("id, url, label, page_type, importance");

  if (upsertError) {
    return NextResponse.json(
      { error: "We couldn't save your pages. Try again." },
      { status: 500 }
    );
  }

  // Deactivate anything not in the new set (keeps baseline history intact).
  // Filter by the upserted row ids — URLs can contain characters that break
  // a PostgREST in-list.
  const keepIds = (upserted ?? []).map((p) => p.id);
  const { error: deactivateError } = await supabase
    .from("monitored_pages")
    .update({ is_active: false })
    .eq("site_id", siteId)
    .not("id", "in", `(${keepIds.join(",")})`);

  if (deactivateError) {
    return NextResponse.json(
      { error: "We couldn't save your pages. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ pages: upserted });
}
