// Single source of truth for severity classification (FR-010–FR-013),
// consumed by both the worker (issue creation) and the web app (display
// logic). Deterministic: same finding in → same severity out. Thresholds
// change ONLY here (and the paired constants in the worker's visual.ts),
// with tests updated — never inline in callers.

import type { IssueType } from "./issues";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Verdict = Severity | "pass";

export interface SeverityResult {
  severity: Severity;
  needsReview: boolean;
}

export type PageImportance = "critical" | "normal";

// ── Visual diff thresholds (FR-010) ─────────────────────────────────────────
// Ratio = changed pixels / total pixels after noise filtering.
export const VISUAL_THRESHOLDS = {
  /** Below this ratio no issue is created at all. */
  none: 0.005,
  /** 0.5–3% → low */
  low: 0.03,
  /** 3–10% → medium */
  medium: 0.1,
  /** > 10% → high + needs_review; above `critical` → critical + needs_review */
  critical: 0.25,
  /**
   * Above-the-fold rule: a diff concentrated at the top of the page (top
   * 900px desktop / 844px mobile) is critical even below the 25% overall
   * band, provided the overall change is already issue-worthy (> 10%).
   */
  foldCritical: 0.25,
} as const;

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

/** Ordered worst → best, for display and worst-of reductions. */
export const SEVERITY_ORDER: readonly Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;

/** Returns the worse (more severe) of two severities. */
export function worstSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] <= SEVERITY_RANK[b] ? a : b;
}

/** Worst severity in a list, or "pass" when the list is empty. */
export function overallVerdict(severities: readonly Severity[]): Verdict {
  if (severities.length === 0) return "pass";
  return severities.reduce(worstSeverity);
}

// ── Typed findings (rule-table input) ────────────────────────────────────────

export type Finding =
  | {
      type: "visual_change_desktop" | "visual_change_mobile";
      /** 0..1 changed-pixel ratio for the full page. */
      ratio: number;
      /** 0..1 changed-pixel ratio for the above-the-fold strip. */
      foldRatio: number;
    }
  | {
      type: "http_status_change";
      /** HTTP status at baseline (null = capture had no response status). */
      from: number | null;
      /** HTTP status now. */
      to: number | null;
    }
  | { type: "page_404" }
  | { type: "page_5xx" }
  | {
      type:
        | "title_changed"
        | "h1_changed"
        | "meta_description_changed"
        | "canonical_changed"
        | "title_missing"
        | "h1_missing"
        | "meta_description_missing";
    }
  | {
      type: "console_error";
      /** How many NEW errors appeared vs baseline. */
      newCount: number;
      /** Any new error text contains "Uncaught". */
      hasUncaught: boolean;
    }
  | { type: "broken_link"; internal: boolean }
  | { type: "missing_image" }
  | { type: "form_missing" }
  | { type: "form_changed" }
  | { type: "cta_missing" }
  | { type: "scan_page_failed" };

export type FindingType = Finding["type"];

// Compile-time check: every Finding type is a valid IssueType.
const _findingTypesAreIssueTypes: FindingType extends IssueType ? true : never = true;
void _findingTypesAreIssueTypes;

// ── Rule table (FR-010/011/012/013) ─────────────────────────────────────────

/**
 * Classify one typed finding into a severity + needs_review flag, or `null`
 * when the finding is below threshold and no issue should be created
 * (currently only sub-0.5% visual diffs).
 *
 * needs_review is true when (FR-013): any critical; visual > 10%; form/CTA
 * missing; page failed to scan; 4xx/5xx status on a monitored page.
 */
export function classifyFinding(
  finding: Finding,
  pageImportance: PageImportance = "normal"
): SeverityResult | null {
  switch (finding.type) {
    // FR-010 visual bands + above-the-fold rule.
    case "visual_change_desktop":
    case "visual_change_mobile": {
      const { ratio, foldRatio } = finding;
      if (ratio < VISUAL_THRESHOLDS.none) return null;
      if (
        ratio > VISUAL_THRESHOLDS.critical ||
        (ratio > VISUAL_THRESHOLDS.medium && foldRatio > VISUAL_THRESHOLDS.foldCritical)
      ) {
        return { severity: "critical", needsReview: true };
      }
      if (ratio > VISUAL_THRESHOLDS.medium) return { severity: "high", needsReview: true };
      if (ratio > VISUAL_THRESHOLDS.low) return { severity: "medium", needsReview: false };
      return { severity: "low", needsReview: false };
    }

    // FR-011: 2xx→4xx/5xx is emitted as page_404/page_5xx (critical); any
    // other transition that reaches here is high. 4xx-class statuses on a
    // monitored page always need review (FR-013 lists 5xx/404/403).
    case "http_status_change": {
      const to = finding.to;
      const needsReview = to === null || to >= 400;
      return { severity: "high", needsReview };
    }
    case "page_404":
    case "page_5xx":
      return { severity: "critical", needsReview: true };

    // FR-011 metadata rules.
    case "title_changed":
    case "h1_changed":
    case "meta_description_changed":
    case "canonical_changed":
      return { severity: "medium", needsReview: false };
    case "title_missing":
    case "h1_missing":
      return { severity: "high", needsReview: false };
    case "meta_description_missing":
      return { severity: "medium", needsReview: false };

    // FR-011: new console errors — medium; high if > 3 new or any "Uncaught".
    case "console_error": {
      const high = finding.newCount > 3 || finding.hasUncaught;
      return { severity: high ? "high" : "medium", needsReview: false };
    }

    // FR-011: new broken links — internal medium, external low.
    case "broken_link":
      return { severity: finding.internal ? "medium" : "low", needsReview: false };

    case "missing_image":
      return { severity: "medium", needsReview: false };

    // FR-012 form/CTA regressions.
    case "form_missing":
      return { severity: "critical", needsReview: true };
    case "form_changed":
      return { severity: "high", needsReview: false };
    case "cta_missing":
      // Page-importance escalation: high on critical pages, medium otherwise.
      return {
        severity: pageImportance === "critical" ? "high" : "medium",
        needsReview: true,
      };

    // PRD § 11: page failed to scan — high + needs_review.
    case "scan_page_failed":
      return { severity: "high", needsReview: true };
  }
}
