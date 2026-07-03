import * as Sentry from "@sentry/node";
import type { Json } from "@siteops/shared/database.types";
import { inngest } from "../client";
import { supabase } from "../../lib/supabase";
import { logPageMetric, logScanMetric } from "../../lib/metrics";
import { runPageCapture } from "../../scan/run-page-capture";

const PAGE_ATTEMPTS = 3; // initial + retry ×2 (PRD § 11)
const ORIGIN_CONCURRENCY = 2; // politeness cap against a single origin

interface PageRow {
  id: string;
  url: string;
}

interface BaselineContext {
  orgId: string;
  siteId: string;
  scanId: string;
}

/**
 * Capture one page for a baseline: run the capture routine (with retries),
 * insert the baselines row only after screenshots are stored, then flip
 * is_current atomically via RPC. On exhausted retries writes a failed row.
 */
async function captureBaselinePage(
  ctx: BaselineContext,
  page: PageRow
): Promise<{ ok: boolean; bytes: number }> {
  let lastError = "capture failed";
  for (let attempt = 1; attempt <= PAGE_ATTEMPTS; attempt++) {
    try {
      const result = await runPageCapture({
        orgId: ctx.orgId,
        siteId: ctx.siteId,
        captureKind: "baseline",
        captureId: ctx.scanId,
        pageId: page.id,
        url: page.url,
      });

      const { data: row, error: insertError } = await supabase
        .from("baselines")
        .insert({
          site_id: ctx.siteId,
          page_id: page.id,
          scan_id: ctx.scanId,
          is_current: false, // flipped by the RPC below
          status: "complete",
          desktop_screenshot_path: result.desktopScreenshotPath,
          mobile_screenshot_path: result.mobileScreenshotPath,
          http_status: result.httpStatus,
          page_title: result.pageTitle,
          meta_description: result.metaDescription,
          h1: result.h1,
          canonical_url: result.canonicalUrl,
          html_hash: result.htmlHash,
          console_errors: result.consoleErrors,
          broken_links: result.brokenLinks,
          // Interface types lack index signatures; shape matches the schema.
          forms: result.forms as unknown as Json,
          ctas: result.ctas as unknown as Json,
        })
        .select("id")
        .single();
      if (insertError || !row) {
        throw new Error(`baseline insert failed: ${insertError?.message}`);
      }

      const { error: rpcError } = await supabase.rpc("set_current_baseline", {
        p_page_id: page.id,
        p_baseline_id: row.id,
      });
      if (rpcError) throw new Error(`set_current_baseline failed: ${rpcError.message}`);

      logPageMetric(ctx.scanId, {
        pageId: page.id,
        url: page.url,
        ok: true,
        durationMs: result.durationMs,
        screenshotBytes: result.screenshotBytes,
      });
      return { ok: true, bytes: result.screenshotBytes };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt === PAGE_ATTEMPTS) break;
    }
  }

  // Exhausted retries: record the failure, keep any previous baseline current.
  await supabase.from("baselines").insert({
    site_id: ctx.siteId,
    page_id: page.id,
    scan_id: ctx.scanId,
    is_current: false,
    status: "failed",
    error_message: lastError.slice(0, 500),
  });
  logPageMetric(ctx.scanId, { pageId: page.id, url: page.url, ok: false, error: lastError });
  return { ok: false, bytes: 0 };
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
    .select("id, url")
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

  return { orgId: site.org_id, pages: pages ?? [] };
}

/** FR-008: baseline creation job with per-page failure isolation. */
export const baselineCreate = inngest.createFunction(
  {
    id: "baseline-create",
    concurrency: [{ key: "event.data.siteId", limit: 1 }],
    retries: 1,
    onFailure: async ({ event }) => {
      const scanId = event.data.event.data.scanId as string;
      await supabase
        .from("scans")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", scanId)
        .in("status", ["queued", "running"]);
      Sentry.captureMessage(`baseline.create failed for scan ${scanId}`, "error");
    },
  },
  { event: "app/baseline.requested" },
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

    const ctx: BaselineContext = { orgId, siteId, scanId };
    let failed = 0;
    let totalBytes = 0;

    // Pages in chunks of 2 — per-origin concurrency cap (product principle 7).
    for (let i = 0; i < pages.length; i += ORIGIN_CONCURRENCY) {
      const chunk = pages.slice(i, i + ORIGIN_CONCURRENCY);
      const results = await Promise.all(
        chunk.map((page) =>
          step.run(`capture-page-${page.id}`, async () => {
            const result = await captureBaselinePage(ctx, page);
            await supabase.rpc("increment_scan_pages_done", { p_scan_id: scanId });
            return result;
          })
        )
      );
      for (const r of results) {
        if (!r.ok) failed++;
        totalBytes += r.bytes;
      }
    }

    await step.run("finalize", async () => {
      const allFailed = failed === pages.length;
      await supabase
        .from("scans")
        .update({
          status: allFailed ? "failed" : "complete",
          completed_at: new Date().toISOString(),
        })
        .eq("id", scanId);
      if (allFailed) {
        Sentry.captureMessage(`baseline failed on every page (scan ${scanId})`, "error");
      }
      logScanMetric(scanId, {
        siteId,
        kind: "baseline",
        status: allFailed ? "failed" : "complete",
        pagesTotal: pages.length,
        pagesFailed: failed,
        durationMs: Date.now() - startedAt,
        screenshotBytes: totalBytes,
      });
    });

    return { pages: pages.length, failed };
  }
);

/**
 * Retry a single failed page from a baseline run (Retry button in the
 * progress UI). Replaces that page's failed row for the run.
 */
export const baselinePageRetry = inngest.createFunction(
  {
    id: "baseline-page-retry",
    concurrency: [{ key: "event.data.siteId", limit: 1 }],
    retries: 0,
  },
  { event: "app/baseline.page-retry" },
  async ({ event, step }) => {
    const { siteId, scanId, pageId } = event.data as {
      siteId: string;
      scanId: string;
      pageId: string;
    };

    return step.run("retry-page", async () => {
      const { data: site } = await supabase
        .from("sites")
        .select("id, org_id")
        .eq("id", siteId)
        .single();
      const { data: page } = await supabase
        .from("monitored_pages")
        .select("id, url")
        .eq("id", pageId)
        .eq("site_id", siteId)
        .single();
      if (!site || !page) throw new Error("site or page not found");

      // Drop the failed row for this run so the UI reflects the retry result.
      await supabase
        .from("baselines")
        .delete()
        .eq("scan_id", scanId)
        .eq("page_id", pageId)
        .eq("status", "failed");

      const result = await captureBaselinePage(
        { orgId: site.org_id, siteId, scanId },
        page
      );

      // If every page of the run is now complete, lift the scan verdict.
      if (result.ok) {
        const { data: failedRows } = await supabase
          .from("baselines")
          .select("id")
          .eq("scan_id", scanId)
          .eq("status", "failed")
          .limit(1);
        if (!failedRows?.length) {
          await supabase
            .from("scans")
            .update({ status: "complete" })
            .eq("id", scanId)
            .eq("status", "failed");
        }
      }
      return result;
    });
  }
);

/**
 * Watchdog (PRD § 11): no baseline run may stay queued/running past 30 min.
 * Fires alongside every run; if the scan is still unfinished, force-fail it.
 */
export const baselineWatchdog = inngest.createFunction(
  { id: "baseline-watchdog", retries: 0 },
  { event: "app/baseline.requested" },
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
      Sentry.captureMessage(`baseline watchdog force-failed scan ${scanId}`, "warning");
    }
    return { forced };
  }
);
