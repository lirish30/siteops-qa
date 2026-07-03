import { NextResponse } from "next/server";
import { createSiteSchema, normalizeSiteUrl } from "@siteops/shared";
import { requireOrg, isGuardResponse } from "@/lib/auth-guards";
import { planLimitResponse, withinSiteLimit } from "@/lib/assert-limits";
import { safeFetch, SsrfError } from "@/lib/safe-fetch";
import { detectWordPress } from "@/lib/wp-detect";

// POST /api/sites — add a site (FR-003): normalize, SSRF-check, verify
// reachability, detect WordPress, insert.
export async function POST(request: Request) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { supabase, orgId, plan } = ctx;

  const body = await request.json().catch(() => null);
  const parsed = createSiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  let origin: string;
  try {
    origin = normalizeSiteUrl(parsed.data.url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "URL is not valid" },
      { status: 400 }
    );
  }

  const { count } = await supabase
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  if (!withinSiteLimit(plan, count ?? 0)) {
    return planLimitResponse(
      "You've reached your plan's site limit. Upgrade to add more sites."
    );
  }

  // Reachability + SSRF check. Follow redirects so e.g. http→https or
  // apex→www lands on the final public origin (PRD § 11).
  let finalOrigin = origin;
  try {
    const res = await safeFetch(origin);
    finalOrigin = new URL(res.url || origin).origin;
    res.body?.cancel();
    if (res.status >= 500) {
      return NextResponse.json(
        { error: "That site responded with a server error. Check the URL and try again." },
        { status: 400 }
      );
    }
  } catch (err) {
    if (err instanceof SsrfError) {
      console.warn("SSRF-blocked site URL", { origin });
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "We couldn't reach that site. Check the URL and try again." },
      { status: 400 }
    );
  }

  const wp = await detectWordPress(finalOrigin);

  const { data: site, error } = await supabase
    .from("sites")
    .insert({
      org_id: orgId,
      url: finalOrigin,
      name: parsed.data.name ?? new URL(finalOrigin).hostname,
      wp_detection: wp.detection,
      wp_signals: { ...wp.signals },
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "We couldn't save that site. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      id: site.id,
      url: site.url,
      name: site.name,
      wpDetection: site.wp_detection,
      wpSignals: site.wp_signals,
    },
    { status: 201 }
  );
}

// GET /api/sites — site list with last-scan verdict.
export async function GET() {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { supabase, orgId } = ctx;

  const { data: sites, error } = await supabase
    .from("sites")
    .select(
      "id, url, name, wp_detection, status, last_scan_at, created_at, scans ( overall_severity, completed_at )"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "scans", ascending: false })
    .limit(1, { referencedTable: "scans" });

  if (error) {
    return NextResponse.json(
      { error: "We couldn't load your sites. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sites: sites.map((s) => ({
      id: s.id,
      url: s.url,
      name: s.name,
      wpDetection: s.wp_detection,
      status: s.status,
      lastScanAt: s.last_scan_at,
      lastScanSeverity: s.scans[0]?.overall_severity ?? null,
    })),
  });
}
