import { NextResponse } from "next/server";
import { requireOrg, isGuardResponse } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { thumbPathFor } from "@siteops/shared";

type Params = { params: Promise<{ scanId: string }> };

const SIGNED_URL_TTL_SECONDS = 60;

// GET /api/scans/:id — scan status + per-page results with signed thumbnail
// URLs (PRD § 4). Polled every 2s by progress UIs. For baseline-trigger scans
// the per-page results come from this run's baselines rows; page_scan_results
// join lands in Phase 3.
export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { supabase, orgId } = ctx;
  const { scanId } = await params;

  const { data: scan } = await supabase
    .from("scans")
    .select(
      "id, site_id, trigger_type, status, user_note, pages_total, pages_done, overall_severity, started_at, completed_at, sites!inner ( org_id )"
    )
    .eq("id", scanId)
    .eq("sites.org_id", orgId)
    .maybeSingle();
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const { data: rows } = await supabase
    .from("baselines")
    .select(
      "id, page_id, status, error_message, desktop_screenshot_path, mobile_screenshot_path, monitored_pages ( label, url )"
    )
    .eq("scan_id", scanId)
    .order("created_at");

  // Sign thumbnails in one batch with the service role (bucket is private).
  const admin = createAdminClient();
  const thumbPaths = (rows ?? [])
    .flatMap((r) => [r.desktop_screenshot_path, r.mobile_screenshot_path])
    .filter((p): p is string => Boolean(p))
    .map((p) => thumbPathFor(p));
  const signed = new Map<string, string>();
  if (thumbPaths.length > 0) {
    const { data: signedUrls } = await admin.storage
      .from("screenshots")
      .createSignedUrls(thumbPaths, SIGNED_URL_TTL_SECONDS);
    for (const entry of signedUrls ?? []) {
      if (entry.signedUrl && entry.path) signed.set(entry.path, entry.signedUrl);
    }
  }

  const results = (rows ?? []).map((r) => ({
    baselineId: r.id,
    pageId: r.page_id,
    label: r.monitored_pages?.label ?? null,
    url: r.monitored_pages?.url ?? null,
    status: r.status,
    errorMessage: r.error_message,
    thumbnails: {
      desktop: r.desktop_screenshot_path
        ? signed.get(thumbPathFor(r.desktop_screenshot_path)) ?? null
        : null,
      mobile: r.mobile_screenshot_path
        ? signed.get(thumbPathFor(r.mobile_screenshot_path)) ?? null
        : null,
    },
  }));

  return NextResponse.json({
    id: scan.id,
    siteId: scan.site_id,
    triggerType: scan.trigger_type,
    status: scan.status,
    userNote: scan.user_note,
    pagesTotal: scan.pages_total,
    pagesDone: scan.pages_done,
    overallSeverity: scan.overall_severity,
    startedAt: scan.started_at,
    completedAt: scan.completed_at,
    results,
  });
}
