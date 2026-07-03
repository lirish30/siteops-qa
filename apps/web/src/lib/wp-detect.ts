import { safeFetch } from "@/lib/safe-fetch";

export type WpDetection = "detected" | "not_detected" | "unknown";

export interface WpSignals {
  wpContent: boolean; // "/wp-content/" substring in homepage HTML
  wpJson: boolean; // GET {origin}/wp-json/ returns JSON with a `name` field
  generatorMeta: boolean; // <meta name="generator" content="WordPress...">
}

export interface WpDetectResult {
  detection: WpDetection;
  signals: WpSignals;
}

const TOTAL_BUDGET_MS = 8_000;

/**
 * WordPress detection (FR-003). Runs the homepage fetch and the /wp-json/
 * probe in parallel under a shared 8s budget. Detected if ≥1 signal fires.
 * Network failures never throw — an unreachable/unreadable site returns
 * "unknown" (PRD § 11: warning, not a block).
 */
export async function detectWordPress(origin: string): Promise<WpDetectResult> {
  const controller = new AbortController();
  const budget = setTimeout(() => controller.abort(), TOTAL_BUDGET_MS);

  const signals: WpSignals = {
    wpContent: false,
    wpJson: false,
    generatorMeta: false,
  };
  let homepageReadable = false;
  let wpJsonProbeCompleted = false;

  try {
    await Promise.all([
      (async () => {
        try {
          const res = await safeFetch(origin, { signal: controller.signal });
          if (!res.ok) return;
          const html = await res.text();
          homepageReadable = true;
          signals.wpContent = html.includes("/wp-content/");
          signals.generatorMeta =
            /<meta[^>]+name=["']generator["'][^>]+content=["']WordPress/i.test(
              html
            ) ||
            /<meta[^>]+content=["']WordPress[^>]+name=["']generator["']/i.test(
              html
            );
        } catch {
          // unreadable homepage — leave signals false
        }
      })(),
      (async () => {
        try {
          const res = await safeFetch(`${origin}/wp-json/`, {
            signal: controller.signal,
            headers: { accept: "application/json" },
          });
          wpJsonProbeCompleted = true;
          if (!res.ok) return;
          const body = (await res.json()) as { name?: unknown };
          signals.wpJson = typeof body?.name === "string";
        } catch {
          // non-JSON or network failure — signal stays false
        }
      })(),
    ]);
  } finally {
    clearTimeout(budget);
  }

  const anySignal = signals.wpContent || signals.wpJson || signals.generatorMeta;
  const detection: WpDetection = anySignal
    ? "detected"
    : homepageReadable || wpJsonProbeCompleted
      ? "not_detected"
      : "unknown";
  return { detection, signals };
}
