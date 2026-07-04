import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrg, isGuardResponse } from "@/lib/auth-guards";
import { planLimitResponse } from "@/lib/assert-limits";
import { inngest } from "@/lib/inngest";

type Params = { params: Promise<{ siteId: string }> };

const runScanSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

const HISTORY_PAGE_SIZE = 20;

// POST /api/sites/:id/scans — queue an on-demand scan (FR-009, PRD § 4).
// 409 if a scan is running, 412 if no current baseline, 402 on expired trial.
export async function POST(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { supabase, userId, orgId, plan } = ctx;
  const { siteId } = await params;

  const parsed = runScanSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: site } = await supabase
    .from("sites")
    .select("id, organizations:org_id ( trial_ends_at, billing_status )")
    .eq("id", siteId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  // Trial guard (FR-022, partial): expired trials can't run new scans.
  const org = site.organizations;
  if (
    plan === "trial" &&
    org?.trial_ends_at &&
    new Date(org.trial_ends_at).getTime() < Date.now()
  ) {
    return planLimitResponse("Your trial has ended. Pick a plan to keep scanning.");
  }

  // One run at a time per site (PRD § 11).
  const { data: activeScan } = await supabase
    .from("scans")
    .select("id")
    .eq("site_id", siteId)
    .in("status", ["queued", "running"])
    .limit(1)
    .maybeSingle();
  if (activeScan) {
    return NextResponse.json(
      { error: "A scan is already running for this site." },
      { status: 409 }
    );
  }

  // 412 without a baseline to compare against (PRD § 11) — UI routes to
  // baseline creation.
  const { data: pages } = await supabase
    .from("monitored_pages")
    .select("id, baselines ( id )")
    .eq("site_id", siteId)
    .eq("is_active", true)
    .eq("baselines.is_current", true)
    .eq("baselines.status", "complete");
  const activePages = pages ?? [];
  if (activePages.length === 0) {
    return NextResponse.json(
      { error: "Pick at least one page to monitor before scanning." },
      { status: 400 }
    );
  }
  if (!activePages.some((p) => p.baselines.length > 0)) {
    return NextResponse.json(
      { error: "Create a baseline first — a scan needs something to compare against." },
      { status: 412 }
    );
  }

  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .insert({
      site_id: siteId,
      trigger_type: "manual",
      status: "queued",
      user_note: parsed.data.note || null,
      pages_total: activePages.length,
      created_by: userId,
    })
    .select("id")
    .single();
  if (scanError || !scan) {
    return NextResponse.json(
      { error: "We couldn't start the scan. Try again." },
      { status: 500 }
    );
  }

  try {
    await inngest.send({
      name: "app/scan.requested",
      data: { siteId, scanId: scan.id },
    });
  } catch (error) {
    console.error("Failed to send scan request to Inngest", error);
    // Don't leave a stuck queued row if the event never made it out.
    await supabase.from("scans").update({ status: "failed" }).eq("id", scan.id);
    return NextResponse.json(
      { error: "We couldn't reach the scan service. Try again in a minute." },
      { status: 502 }
    );
  }

  return NextResponse.json({ scanId: scan.id }, { status: 202 });
}

// GET /api/sites/:id/scans — cursor-paginated scan history (FR-018) with
// per-severity open-issue counts.
export async function GET(request: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (isGuardResponse(ctx)) return ctx;
  const { supabase, orgId } = ctx;
  const { siteId } = await params;

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(Number(url.searchParams.get("limit")) || HISTORY_PAGE_SIZE, 50);

  let query = supabase
    .from("scans")
    .select("id, trigger_type, status, user_note, pages_total, pages_done, overall_severity, started_at, completed_at, created_at")
    .eq("site_id", siteId)
    .eq("trigger_type", "manual")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (cursor) query = query.lt("created_at", cursor);

  const { data: scans, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Couldn't load scan history." }, { status: 500 });
  }

  // Open-issue counts by severity, aggregated client-side over one query.
  const scanIds = (scans ?? []).map((s) => s.id);
  const counts = new Map<string, Record<string, number>>();
  if (scanIds.length > 0) {
    const { data: issues } = await supabase
      .from("issues")
      .select("scan_id, severity")
      .in("scan_id", scanIds)
      .eq("status", "open");
    for (const issue of issues ?? []) {
      const bySeverity = counts.get(issue.scan_id) ?? {};
      bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
      counts.set(issue.scan_id, bySeverity);
    }
  }

  const items = (scans ?? []).map((s) => ({
    id: s.id,
    status: s.status,
    note: s.user_note,
    pagesTotal: s.pages_total,
    pagesDone: s.pages_done,
    overallSeverity: s.overall_severity,
    startedAt: s.started_at,
    completedAt: s.completed_at,
    createdAt: s.created_at,
    issueCounts: counts.get(s.id) ?? {},
  }));

  const nextCursor = items.length === limit ? items[items.length - 1].createdAt : null;
  return NextResponse.json({ scans: items, nextCursor });
}
