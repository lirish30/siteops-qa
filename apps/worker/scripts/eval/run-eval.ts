import http from "node:http";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
  classifyFinding,
  VISUAL_THRESHOLDS,
  type Finding,
  type IssueType,
  type Severity,
} from "@siteops/shared";
import { capturePage } from "../../src/scan/capture";
import { closeBrowser } from "../../src/scan/browser";
import { compareTechnical, type BaselineSnapshot, type ScanSnapshot } from "../../src/scan/diff/technical";

interface ExpectedIssue {
  type: IssueType;
  severity: Severity;
}

interface CaseManifest {
  name: string;
  expected: ExpectedIssue[];
}

interface EvalResult {
  name: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASES_DIR = path.join(__dirname, "cases");
const RESULTS_PATH = path.resolve(__dirname, "../../../../docs/eval-results.md");

async function main() {
  const server = await startStaticServer(CASES_DIR);
  const origin = `http://127.0.0.1:${server.port}`;
  const results: EvalResult[] = [];

  try {
    for (const caseDir of await readdir(CASES_DIR)) {
      const dir = path.join(CASES_DIR, caseDir);
      const manifest = JSON.parse(
        await readFile(path.join(dir, "expected.json"), "utf8")
      ) as CaseManifest;
      const beforeUrl = `${origin}/${caseDir}/before.html`;
      const afterUrl = `${origin}/${caseDir}/after.html`;

      const [before, after] = await Promise.all([
        capturePage(beforeUrl, "desktop"),
        capturePage(afterUrl, "desktop"),
      ]);

      const technical = compareTechnical(toBaseline(before), toScan(after), "critical");
      const actual: ExpectedIssue[] = technical.issues.map((issue) => ({
        type: issue.type,
        severity: issue.severity,
      }));

      const visual = classifyVisual(before.screenshot, after.screenshot);
      if (visual) actual.push(visual);

      const expectedKey = key(manifest.expected);
      const actualKey = key(actual);
      results.push({
        name: manifest.name,
        expected: expectedKey || "none",
        actual: actualKey || "none",
        pass: expectedKey === actualKey,
      });
    }
  } finally {
    await closeBrowser();
    await server.close();
  }

  const passed = results.filter((result) => result.pass).length;
  await writeFile(RESULTS_PATH, renderMarkdown(results), "utf8");
  console.log(`Eval complete: ${passed}/${results.length} passed`);
  if (passed < 8) process.exitCode = 1;
}

function toBaseline(capture: Awaited<ReturnType<typeof capturePage>>): BaselineSnapshot {
  return {
    httpStatus: capture.httpStatus,
    pageTitle: capture.extract.title,
    metaDescription: capture.extract.metaDescription,
    h1: capture.extract.h1,
    canonicalUrl: capture.extract.canonical,
    consoleErrors: capture.consoleErrors,
    brokenLinks: [],
    forms: capture.extract.forms,
    ctas: capture.extract.ctas,
  };
}

function toScan(capture: Awaited<ReturnType<typeof capturePage>>): ScanSnapshot {
  return {
    ...toBaseline(capture),
    missingImages: capture.failedRequests
      .filter((request) => request.resourceType === "image")
      .map((request) => request.url),
    brokenLinks: capture.extract.internalLinks
      .filter((href) => href.endsWith("/missing"))
      .map((href) => ({ href, status: 404, internal: true })),
  };
}

function classifyVisual(
  beforePng: Buffer,
  afterPng: Buffer
): ExpectedIssue | null {
  const before = PNG.sync.read(beforePng);
  const after = PNG.sync.read(afterPng);
  const width = Math.max(before.width, after.width);
  const height = Math.max(before.height, after.height);
  const paddedBefore = padPng(before, width, height);
  const paddedAfter = padPng(after, width, height);
  const diff = new PNG({ width, height });
  const changed = pixelmatch(
    paddedBefore.data,
    paddedAfter.data,
    diff.data,
    width,
    height,
    { threshold: 0.1, includeAA: false }
  );
  const ratio = changed / (width * height);
  if (ratio < VISUAL_THRESHOLDS.none) return null;
  const classified = classifyFinding({
    type: "visual_change_desktop",
    ratio,
    foldRatio: ratio,
  } satisfies Finding);
  return classified
    ? { type: "visual_change_desktop", severity: classified.severity }
    : null;
}

function padPng(source: PNG, width: number, height: number): PNG {
  if (source.width === width && source.height === height) return source;
  const out = new PNG({ width, height, fill: true });
  PNG.bitblt(source, out, 0, 0, source.width, source.height, 0, 0);
  return out;
}

function key(issues: ExpectedIssue[]): string {
  return [...issues]
    .sort((a, b) => `${a.type}:${a.severity}`.localeCompare(`${b.type}:${b.severity}`))
    .map((issue) => `${issue.type}:${issue.severity}`)
    .join(", ");
}

function renderMarkdown(results: EvalResult[]): string {
  const passed = results.filter((result) => result.pass).length;
  const rows = results
    .map(
      (result) =>
        `| ${result.pass ? "pass" : "fail"} | ${result.name} | ${result.expected} | ${result.actual} |`
    )
    .join("\n");
  return `# Phase 3 Eval Results

Generated by \`npm exec --workspace apps/worker tsx scripts/eval/run-eval.ts\`.

Result: **${passed}/${results.length} passed**.

| Status | Case | Expected | Actual |
|---|---|---|---|
${rows}
`;
}

function startStaticServer(root: string): Promise<{
  port: number;
  close: () => Promise<void>;
}> {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const target = path.normalize(path.join(root, url.pathname));
    if (!target.startsWith(root)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    if (url.pathname.endsWith("/missing")) {
      res.writeHead(404, { "content-type": "text/plain" }).end("Missing");
      return;
    }
    if (url.pathname.includes("page-404/after.html")) {
      res.writeHead(404, { "content-type": "text/html" });
    } else if (url.pathname.includes("page-500/after.html")) {
      res.writeHead(500, { "content-type": "text/html" });
    } else {
      res.writeHead(200, { "content-type": "text/html" });
    }
    res.end(await readFile(target));
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("missing port");
      resolve({
        port: address.port,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

main().catch(async (err) => {
  await closeBrowser();
  console.error(err);
  process.exit(1);
});
