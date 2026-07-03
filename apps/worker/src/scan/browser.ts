import { chromium, type Browser } from "playwright";

// One Chromium per worker process. Contexts are cheap; browsers are not.
let browserPromise: Promise<Browser> | null = null;

export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage"],
    });
    browserPromise.then((browser) => {
      browser.on("disconnected", () => {
        // Crash recovery: next capture relaunches.
        browserPromise = null;
      });
    });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = null;
  await browser.close();
}
