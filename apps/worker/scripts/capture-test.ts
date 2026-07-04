// Scratch verification for the capture harness (TASK-025/026/027):
//   npx tsx apps/worker/scripts/capture-test.ts https://example.com
// Writes PNGs to the OS temp dir and prints extraction + link-check results.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capturePage } from "../src/scan/capture";
import { checkLinks } from "../src/scan/links";
import { closeBrowser } from "../src/scan/browser";

const url = process.argv[2];
if (!url) {
  console.error("usage: tsx capture-test.ts <url>");
  process.exit(1);
}

const outDir = mkdtempSync(join(tmpdir(), "siteops-capture-"));

for (const viewport of ["desktop", "mobile"] as const) {
  const started = Date.now();
  const result = await capturePage(url, viewport);
  const file = join(outDir, `${viewport}.png`);
  writeFileSync(file, result.screenshot);
  console.log(`\n── ${viewport} (${Date.now() - started}ms) → ${file}`);
  console.log("http status:", result.httpStatus);
  console.log("title:", result.extract.title);
  console.log("h1:", result.extract.h1);
  console.log("meta description:", result.extract.metaDescription?.slice(0, 80));
  console.log("canonical:", result.extract.canonical);
  console.log("html hash:", result.htmlHash.slice(0, 16), "…");
  console.log("forms:", JSON.stringify(result.extract.forms, null, 1));
  console.log("ctas:", JSON.stringify(result.extract.ctas, null, 1));
  console.log("internal links:", result.extract.internalLinks.length);
  console.log("console errors:", result.consoleErrors.length, result.consoleErrors.slice(0, 3));
  console.log("failed requests:", result.failedRequests.length);

  if (viewport === "desktop") {
    const broken = await checkLinks(result.extract.internalLinks.slice(0, 25), new URL(url).origin);
    console.log("broken links (first 25 checked):", broken);
  }
}

await closeBrowser();
