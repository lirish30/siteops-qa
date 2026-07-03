import * as Sentry from "@sentry/node";

// Scan cost telemetry (TASK-034): structured JSON logs + Sentry breadcrumbs.
// PostHog server-side capture replaces/extends this in Phase 6.

export interface PageMetric {
  pageId: string;
  url: string;
  ok: boolean;
  durationMs?: number;
  screenshotBytes?: number;
  error?: string;
}

export function logPageMetric(scanId: string, metric: PageMetric): void {
  console.log(JSON.stringify({ msg: "scan.page", scanId, ...metric }));
  Sentry.addBreadcrumb({
    category: "scan.page",
    level: metric.ok ? "info" : "warning",
    data: { scanId, ...metric },
  });
}

export function logScanMetric(
  scanId: string,
  data: {
    siteId: string;
    kind: "baseline" | "scan";
    status: string;
    pagesTotal: number;
    pagesFailed: number;
    durationMs: number;
    screenshotBytes: number;
  }
): void {
  console.log(JSON.stringify({ msg: "scan.completed", scanId, ...data }));
  Sentry.addBreadcrumb({ category: "scan.completed", level: "info", data: { scanId, ...data } });
}
