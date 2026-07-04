import * as Sentry from "@sentry/node";
import {
  classifyFinding,
  overallVerdict,
  worstSeverity,
  type PageImportance,
  type Severity,
} from "@siteops/shared";
import type { Json } from "@siteops/shared/database.types";
import { inngest } from "../client";
import { supabase } from "../../lib/supabase";
import { logPageMetric, logScanMetric } from "../../lib/metrics";
import { runPageCapture, type PageCaptureOutput } from "../../scan/run-page-capture";
import { downloadScreenshot } from "../../scan/storage";
import { runVisualDiff, type IgnoredRegion, type VisualDiffResult } from "../../scan/diff/visual";
import {
  compareTechnical,
  type BaselineSnapshot,
  type IssueDraft,
} from "../../scan/diff/technical";
import type { Viewport } from "../../scan/capture";

const PAGE_ATTEMPTS = 3; // initial + retry ×2 (PRD § 11)
const ORIGIN_CONCURRENCY = 2; // politeness cap against a single origin
const HEIGHT_DELTA_SIGNAL_PCT = 20; // § 11: layout-change signal threshold

interface ScanPageRow {
  id: string;
  url: string;
  label: string | null;
  importance: PageImportance;
  ignored_regions: IgnoredRegion[];
}

interface BaselineRow {
  id: string;
  status: string;
  desktop_screenshot_path: string | null;
  mobile_screenshot_path: string | null;
  http_status: number | null;
  page_title: string | null;
  meta_description: string | null;
  h1: string | null;
  canonical_url: string | null;
  console_errors: BaselineSnapshot["consoleErrors"];
  broken_links: BaselineSnapshot["brokenLinks"];
  forms: BaselineSnapshot["forms"];
  ctas: BaselineSnapshot["ctas"];
}

interface ScanContext {
  orgId: string;
  siteId: string;
  scanId: string;
}

interface PageOutcome {
  ok: boolean;
  severity: Severity | null;
  issueSeverities: Severity[];
  bytes: number;
}

function baselineSnapshot(row: BaselineRow): BaselineSnapshot {
  return {
    httpStatus: row.http_status,
    pageTitle: row.page_title,
    metaDescription: row.meta_description,
    h1: row.h1,
    canonicalUrl: row.canonical_url,
    consoleErrors: row.console_errors ?? [],
    brokenLinks: row.broken_links ?? [],
    forms: row.forms ?? [],
    ctas: row.ctas ?? [],
  };
}

/** Visual diff for one viewport → issue draft (or null below threshold). */
function visualIssueDraft(
  viewport: Viewport,
  diff: VisualDiffResult,
  importance: PageImportance,
  pageLabel: string | null
): IssueDraft | null {
  const type = viewport === "desktop" ? "visual_change_desktop" : "visual_change_mobile";
  const classified = classifyFinding(
    { type, ratio: diff.ratio, foldRatio: diff.foldRatio },
    importance
  );
  if (!classified) return null;
  const pct = (diff.ratio * 100).toFixed(1);
  const layoutShift = diff.heightDeltaPct > HEIGHT_DELTA_SIGNAL_PCT;
  return {
    type,
    severity: classified.severity,
    needsReview: classified.needsReview,
    title: `Visual change on ${viewport} (${pct}% of the page)`,
    description:
      `${pct}% of the ${viewport} view of ${pageLabel ?? "this page"} looks different from the baseline.` +
      (layoutShift
        ? ` The page height also changed by ${diff.heightDeltaPct.toFixed(0)}%, which usually means a layout shift.`
        : ""),
    evidence: {
      viewport,
      ratio: diff.ratio,
      foldRatio: diff.foldRatio,
      heightDeltaPct: diff.heightDeltaPct,
      diffPath: diff.diffPath,
    },
    recommendation:
      "Open the side-by-side comparison. If the change was intentional, mark it as expected.",
  };
}

async function insertIssues(
  ctx: ScanContext,
  pageId: string,
  drafts: IssueDraft[]
): Promise<void> {
  if (drafts.length === 0) return;
  const { error } = await supabase.from("issues").insert(
    drafts.map((d) => ({
      scan_id: ctx.scanId,
      page_id: pageId,
      type: d.type,
      severity: d.severity,
      needs_review: d.needsReview,
      title: d.title,
      description: d.description,
      evidence: d.evidence as Json,
      recommendation: d.recommendation,
    }))
  );
  if (error) throw new Error(`issues insert failed: ${error.message}`);
}

/**
 * Scan one page (FR-009): capture with retries, then — when a current
 * baseline exists — visual diff both viewports (FR-010) and technical
 * comparison (FR-011/012), insert issues, and write the page_scan_results
 * row. Missing baseline → capture-only with an info note. Exhausted retries
 * → failed row + scan_page_failed issue (high, needs_review; PRD § 11).
 */
async function scanPage(ctx: ScanContext, page: ScanPageRow): Promise<PageOutcome> {
  // Current baseline (if any) — loaded first so a broken load fails fast.
  const { data: baseline, error: baselineError } = await supabase
    .from("baselines")
    .select(
      "id, status, desktop_screenshot_path, mobile_screenshot_path, http_status, page_title, meta_description, h1, canonical_url, console_errors, broken_links, forms, ctas"
    )
    .eq("page_id", page.id)
    .eq("is_current", true)
    .eq("status", "complete")
    .maybeSingle();
  if (baselineError) throw new Error(`baseline load failed: ${baselineError.message}`);

  let capture: PageCaptureOutput | null = null;
  let lastError = "capture failed";
  for (let attempt = 1; attempt <= PAGE_ATTEMPTS; attempt++) {
    try {
      capture = await runPageCapture({
        orgId: ctx.orgId,
        siteId: ctx.siteId,
        captureKind: "scan",
        captureId: ctx.scanId,
        pageId: page.id,
        url: page.url,
      });
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (!capture) {
    // Failed page: isolated failure row + issue; other pages proceed.
    await supabase.from("page_scan_results").insert({
      scan_id: ctx.scanId,
      page_id: page.id,
      baseline_id: baseline?.id ?? null,
      status: "failed",
      error_message: lastError.slice(0, 500),
    });
    const classified = classifyFinding({ type: "scan_page_failed" }, page.importance);
    const draft: IssueDraft = {
      type: "scan_page_failed",
      severity: classified?.severity ?? "high",
      needsReview: classified?.needsReview ?? true,
      title: `We couldn't scan ${page.label ?? page.url}`,
      description:
        "The page didn't load during the scan after several attempts. It may be down, very slow, or blocking our scanner (e.g. a bot challenge).",
      evidence: { url: page.url, error: lastError.slice(0, 500) },
      recommendation: "Open the page in a browser to check it's up, then retry the scan.",
    };
    await insertIssues(ctx, page.id, [draft]);
    logPageMetric(ctx.scanId, { pageId: page.id, url: page.url, ok: false, error: lastError });
    return { ok: false, severity: draft.severity, issueSeverities: [draft.severity], bytes: 0 };
  }

  const drafts: IssueDraft[] = [];
  const infoNotes: string[] = [];
  let desktopDiff: VisualDiffResult | null = null;
  let mobileDiff: VisualDiffResult | null = null;

  if (baseline?.desktop_screenshot_path && baseline.mobile_screenshot_path) {
    // JSONB columns come back as Json; shapes are what the capture wrote.
    const b = baseline as unknown as BaselineRow;
    const [baseDesktop, baseMobile] = await Promise.all([
      downloadScreenshot(b.desktop_screenshot_path!),
      downloadScreenshot(b.mobile_screenshot_path!),
    ]);
    const loc = {
      orgId: ctx.orgId,
      siteId: ctx.siteId,
      captureKind: "scan" as const,
      captureId: ctx.scanId,
      pageId: page.id,
    };
    desktopDiff = await runVisualDiff(
      baseDesktop,
      capture.screenshots.desktop,
      { ...loc, viewport: "desktop" },
      page.ignored_regions
    );
    mobileDiff = await runVisualDiff(
      baseMobile,
      capture.screenshots.mobile,
      { ...loc, viewport: "mobile" },
      page.ignored_regions
    );

    for (const [viewport, diff] of [
      ["desktop", desktopDiff],
      ["mobile", mobileDiff],
    ] as const) {
      const draft = visualIssueDraft(viewport, diff, page.importance, page.label);
      if (draft) drafts.push(draft);
    }

    const technical = compareTechnical(
      baselineSnapshot(b),
      {
        httpStatus: capture.httpStatus,
        pageTitle: capture.pageTitle,
        metaDescription: capture.metaDescription,
        h1: capture.h1,
        canonicalUrl: capture.canonicalUrl,
        consoleErrors: capture.consoleErrors,
        brokenLinks: capture.brokenLinks,
        forms: capture.forms,
        ctas: capture.ctas,
        missingImages: capture.missingImages,
      },
      page.importance
    );
    drafts.push(...technical.issues);
    infoNotes.push(...technical.infoNotes);
  } else {
    infoNotes.push("No baseline for this page yet — captured without comparison.");
  }

  const pageSeverity =
    drafts.length > 0 ? drafts.map((d) => d.severity).reduce(worstSeverity) : null;

  const { error: insertError } = await supabase.from("page_scan_results").insert({
    scan_id: ctx.scanId,
    page_id: page.id,
    baseline_id: baseline?.id ?? null,
    status: "complete",
    http_status: capture.httpStatus,
    desktop_screenshot_path: capture.desktopScreenshotPath,
    mobile_screenshot_path: capture.mobileScreenshotPath,
    desktop_diff_path: desktopDiff?.diffPath ?? null,
    mobile_diff_path: mobileDiff?.diffPath ?? null,
    desktop_diff_ratio: desktopDiff?.ratio ?? null,
    mobile_diff_ratio: mobileDiff?.ratio ?? null,
    metadata_snapshot: {
      pageTitle: capture.pageTitle,
      metaDescription: capture.metaDescription,
      h1: capture.h1,
      canonicalUrl: capture.canonicalUrl,
      htmlHash: capture.htmlHash,
      heightDeltaPct: {
        desktop: desktopDiff?.heightDeltaPct ?? null,
        mobile: mobileDiff?.heightDeltaPct ?? null,
      },
      infoNotes,
    } as Json,
    console_errors: capture.consoleErrors as unknown as Json,
    broken_links: capture.brokenLinks as unknown as Json,
    forms: capture.forms as unknown as Json,
    ctas: capture.ctas as unknown as Json,
    severity: pageSeverity,
  });
  if (insertError) throw new Error(`page_scan_results insert failed: ${insertError.message}`);

  await insertIssues(ctx, page.id, drafts);

  logPageMetric(ctx.scanId, {
    pageId: page.id,
    url: page.url,
    ok: true,
    durationMs: capture.durationMs,
    screenshotBytes: capture.screenshotBytes,
  });
  return {
    ok: true,
    severity: pageSeverity,
    issueSeverities: drafts.map((d) => d.severity),
    bytes: capture.screenshotBytes,
  };
}

async function loadContext(siteId: string, scanId: string) {
  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, org_id, url")
    .eq("id", siteId)
    .single();
  if (siteError || !site) throw new Error(`site not found: ${siteId}`);

  const { data: pages, error: pagesError } = await supabase
    .from("monitored_pages")
    .select("id, url, label, importance, ignored_regions")
    .eq("site_id", siteId)
    .eq("is_active", true)
    .order("url");
  if (pagesError) throw new Error(`pages load failed: ${pagesError.message}`);

  await supabase
    .from("scans")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      pages_total: pages?.length ?? 0,
      pages_done: 0,
    })
    .eq("id", scanId)
    .in("status", ["queued", "running"]);

  return { orgId: site.org_id, pages: (pages ?? []) as unknown as ScanPageRow[] };
}

/** FR-009: on-demand scan — capture, diff, classify, per-page isolation. */
export const scanRun = inngest.createFunction(
  {
    id: "scan-run",
    concurrency: [
      { key: "event.data.siteId", limit: 1 },
      { limit: 3 },
    ],
    retries: 1,
    onFailure: async ({ event }) => {
      const scanId = event.data.event.data.scanId as string;
      await supabase
        .from("scans")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", scanId)
        .in("status", ["queued", "running"]);
      Sentry.captureMessage(`scan.run failed for scan ${scanId}`, "error");
    },
  },
  { event: "app/scan.requested" },
  async ({ event, step }) => {
    const { siteId, scanId } = event.data as { siteId: string; scanId: string };
    const startedAt = Date.now();

    const { orgId, pages } = await step.run("load-and-start", () =>
      loadContext(siteId, scanId)
    );

    if (pages.length === 0) {
      await step.run("finalize-empty", async () => {
        await supabase
          .from("scans")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", scanId);
      });
      return { pages: 0 };
    }

    const ctx: ScanContext = { orgId, siteId, scanId };
    const severities: Severity[] = [];
    let failed = 0;
    let totalBytes = 0;

    // Pages in chunks of 2 — per-origin concurrency cap (product principle 7).
    for (let i = 0; i < pages.length; i += ORIGIN_CONCURRENCY) {
      const chunk = pages.slice(i, i + ORIGIN_CONCURRENCY);
      const results = await Promise.all(
        chunk.map((page) =>
          step.run(`scan-page-${page.id}`, async () => {
            const result = await scanPage(ctx, page);
            await supabase.rpc("increment_scan_pages_done", { p_scan_id: scanId });
            // Buffers never leave scanPage; this return is JSON-safe.
            return {
              ok: result.ok,
              issueSeverities: result.issueSeverities,
              bytes: result.bytes,
            };
          })
        )
      );
      for (const r of results) {
        if (!r.ok) failed++;
        severities.push(...(r.issueSeverities as Severity[]));
        totalBytes += r.bytes;
      }
    }

    // AI summaries (FR-014) land in Phase 4 — placeholder step keeps the
    // step graph stable so adding it won't re-run capture steps.
    await step.run("ai-summaries-placeholder", async () => ({ skipped: true }));

    await step.run("finalize", async () => {
      const allFailed = failed === pages.length;
      const verdict = overallVerdict(severities);
      await supabase
        .from("scans")
        .update({
          status: allFailed ? "failed" : "complete",
          overall_severity: allFailed ? null : verdict,
          completed_at: new Date().toISOString(),
        })
        .eq("id", scanId);
      if (!allFailed) {
        await supabase
          .from("sites")
          .update({ last_scan_at: new Date().toISOString() })
          .eq("id", siteId);
      } else {
        Sentry.captureMessage(`scan failed on every page (scan ${scanId})`, "error");
      }
      logScanMetric(scanId, {
        siteId,
        kind: "scan",
        status: allFailed ? "failed" : "complete",
        pagesTotal: pages.length,
        pagesFailed: failed,
        durationMs: Date.now() - startedAt,
        screenshotBytes: totalBytes,
      });
    });

    return { pages: pages.length, failed, verdict: overallVerdict(severities) };
  }
);

/**
 * Watchdog (PRD § 11): no scan may stay queued/running past 30 min.
 * Fires alongside every run; if the scan is still unfinished, force-fail it.
 */
export const scanWatchdog = inngest.createFunction(
  { id: "scan-watchdog", retries: 0 },
  { event: "app/scan.requested" },
  async ({ event, step }) => {
    const { scanId } = event.data as { scanId: string };
    await step.sleep("wait-30m", "30m");
    const forced = await step.run("force-fail-if-stuck", async () => {
      const { data } = await supabase
        .from("scans")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", scanId)
        .in("status", ["queued", "running"])
        .select("id");
      return (data?.length ?? 0) > 0;
    });
    if (forced) {
      Sentry.captureMessage(`scan watchdog force-failed scan ${scanId}`, "warning");
    }
    return { forced };
  }
);
