import { capturePage, type CaptureResult } from "./capture";
import { checkLinks, type BrokenLink } from "./links";
import { storeScreenshot } from "./storage";

export interface PageCaptureInput {
  orgId: string;
  siteId: string;
  captureKind: "baseline" | "scan";
  captureId: string; // scan id
  pageId: string;
  url: string;
}

/** Everything a baselines / page_scan_results row needs. */
export interface PageCaptureOutput {
  httpStatus: number | null;
  desktopScreenshotPath: string;
  mobileScreenshotPath: string;
  pageTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonicalUrl: string | null;
  htmlHash: string;
  consoleErrors: { type: string; text: string; url: string | null }[];
  brokenLinks: { href: string; status: number | null; internal: boolean }[];
  forms: CaptureResult["extract"]["forms"];
  ctas: CaptureResult["extract"]["ctas"];
  missingImages: string[];
  screenshotBytes: number;
  durationMs: number;
}

/**
 * The full capture routine for one monitored page (FR-006): desktop + mobile
 * capture, extraction, broken-link check, screenshot upload. Shared by
 * baseline.create (Phase 2) and scan.run (Phase 3). Throws on failure —
 * callers own retries and failure rows.
 */
export async function runPageCapture(input: PageCaptureInput): Promise<PageCaptureOutput> {
  const startedAt = Date.now();

  // Sequential, not parallel: two viewports of the same page at once counts
  // against the per-origin politeness budget (product principle 7).
  const desktop = await capturePage(input.url, "desktop");
  const mobile = await capturePage(input.url, "mobile");

  const origin = new URL(input.url).origin;
  const brokenLinks = await checkLinks(desktop.extract.internalLinks, origin);

  const loc = {
    orgId: input.orgId,
    siteId: input.siteId,
    captureKind: input.captureKind,
    captureId: input.captureId,
    pageId: input.pageId,
  } as const;
  const [desktopStored, mobileStored] = await Promise.all([
    storeScreenshot(desktop.screenshot, { ...loc, viewport: "desktop" }),
    storeScreenshot(mobile.screenshot, { ...loc, viewport: "mobile" }),
  ]);

  // Console errors from both viewports, deduped by text.
  const seen = new Set<string>();
  const consoleErrors = [...desktop.consoleErrors, ...mobile.consoleErrors]
    .filter((e) => {
      if (seen.has(e.text)) return false;
      seen.add(e.text);
      return true;
    })
    .slice(0, 50);

  // Missing images: failed <img> loads plus image responses ≥400.
  const missingImages = [
    ...new Set([
      ...desktop.extract.missingImages,
      ...desktop.failedRequests.filter((r) => r.resourceType === "image").map((r) => r.url),
    ]),
  ].slice(0, 20);

  return {
    httpStatus: desktop.httpStatus,
    desktopScreenshotPath: desktopStored.path,
    mobileScreenshotPath: mobileStored.path,
    pageTitle: desktop.extract.title,
    metaDescription: desktop.extract.metaDescription,
    h1: desktop.extract.h1,
    canonicalUrl: desktop.extract.canonical,
    htmlHash: desktop.htmlHash,
    consoleErrors,
    brokenLinks: brokenLinks as BrokenLink[],
    forms: desktop.extract.forms,
    ctas: desktop.extract.ctas,
    missingImages,
    screenshotBytes: desktopStored.bytes + mobileStored.bytes,
    durationMs: Date.now() - startedAt,
  };
}
