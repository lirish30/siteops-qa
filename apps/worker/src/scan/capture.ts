import type { Page } from "playwright";
import { getBrowser } from "./browser";
import { extractFromPage, hashHtml, type PageExtract } from "./extract";

export type Viewport = "desktop" | "mobile";

const VIEWPORTS: Record<Viewport, { width: number; height: number; isMobile: boolean }> = {
  desktop: { width: 1440, height: 900, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true },
};

const BOT_UA_SUFFIX = "SiteOpsQA-Bot/1.0 (+https://siteopsqa.com/bot)";
const DESKTOP_UA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 ${BOT_UA_SUFFIX}`;
const MOBILE_UA = `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 ${BOT_UA_SUFFIX}`;

const NAV_TIMEOUT_MS = 30_000;
const NETWORK_IDLE_CAP_MS = 10_000;

export interface ConsoleErrorEntry {
  type: string; // "console" | "pageerror"
  text: string;
  url: string | null;
}

export interface FailedRequestEntry {
  url: string;
  status: number | null; // null = network failure
  resourceType: string;
}

export interface CaptureResult {
  viewport: Viewport;
  httpStatus: number | null;
  screenshot: Buffer;
  consoleErrors: ConsoleErrorEntry[];
  failedRequests: FailedRequestEntry[];
  htmlHash: string;
  extract: PageExtract;
}

/**
 * Capture one page in one viewport (FR-006). Fresh browser context per call:
 * fixed viewport, bot-suffixed UA, reduced motion + animation-freeze CSS,
 * lazy-load scroll-through, then a full-page PNG. Read-only by product
 * principle — no form submission, no POSTs.
 */
export async function capturePage(url: string, viewport: Viewport): Promise<CaptureResult> {
  const browser = await getBrowser();
  const vp = VIEWPORTS[viewport];
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    deviceScaleFactor: 1, // keep files small (PRD § 2 gotchas)
    userAgent: vp.isMobile ? MOBILE_UA : DESKTOP_UA,
    reducedMotion: "reduce",
  });

  try {
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);

    const consoleErrors: ConsoleErrorEntry[] = [];
    const failedRequests: FailedRequestEntry[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push({ type: "console", text: msg.text(), url: msg.location().url || null });
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push({ type: "pageerror", text: err.message, url: null });
    });
    page.on("requestfailed", (req) => {
      failedRequests.push({
        url: req.url(),
        status: null,
        resourceType: req.resourceType(),
      });
    });
    page.on("response", (res) => {
      if (res.status() >= 400) {
        failedRequests.push({
          url: res.url(),
          status: res.status(),
          resourceType: res.request().resourceType(),
        });
      }
    });

    const response = await page.goto(url, { waitUntil: "domcontentloaded" });
    const httpStatus = response?.status() ?? null;

    // networkidle capped at 10s — busy sites never settle (PRD § 2 gotchas).
    await Promise.race([
      page.waitForLoadState("networkidle").catch(() => undefined),
      page.waitForTimeout(NETWORK_IDLE_CAP_MS),
    ]);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addStyleTag({
      content: "*{animation:none!important;transition:none!important;caret-color:transparent!important}",
    });

    await scrollThrough(page);

    const extract = await extractFromPage(page);
    const html = await page.content();
    const htmlHash = hashHtml(html);

    const screenshot = await page.screenshot({ fullPage: true, type: "png" });

    return {
      viewport,
      httpStatus,
      screenshot,
      consoleErrors: consoleErrors.slice(0, 50),
      failedRequests: failedRequests.slice(0, 100),
      htmlHash,
      extract,
    };
  } finally {
    await context.close();
  }
}

/** Scroll to the bottom in viewport-sized steps (triggers lazy-load), back to top. */
async function scrollThrough(page: Page): Promise<void> {
  await page
    .evaluate(async () => {
      const step = window.innerHeight;
      const limit = 30; // safety on infinite-scroll pages
      for (let i = 0; i < limit; i++) {
        const bottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 2;
        if (bottom) break;
        window.scrollBy(0, step);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 250));
    })
    .catch(() => undefined); // scrolling is best-effort
}
