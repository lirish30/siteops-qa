// Single source of truth for severity classification, consumed by both the
// worker (issue creation) and the web app (display logic). The full
// deterministic rule table is implemented in Phase 3 (TASK-035); this file
// establishes the seam now so no other module ever grows its own copy.

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Verdict = Severity | "pass";

export interface SeverityResult {
  severity: Severity;
  needsReview: boolean;
}

export type PageImportance = "critical" | "normal";

// Rule table filled in Phase 3 (FR-010–FR-013). Empty until then.
export const SEVERITY_RULES: Record<string, never> = {};
