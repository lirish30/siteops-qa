// Issue type union per PRD § 3 Data Model > Issue Types.
export const ISSUE_TYPES = [
  "http_status_change",
  "page_404",
  "page_5xx",
  "visual_change_desktop",
  "visual_change_mobile",
  "form_missing",
  "form_changed",
  "cta_missing",
  "broken_link",
  "missing_image",
  "console_error",
  "title_changed",
  "title_missing",
  "h1_changed",
  "h1_missing",
  "meta_description_changed",
  "meta_description_missing",
  "canonical_changed",
  "scan_page_failed",
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

export type IssueStatus = "open" | "expected" | "resolved" | "dismissed";

/**
 * Issues that count toward verdicts, severity chips, and reports (US-005):
 * expected/resolved/dismissed issues are excluded everywhere counts are shown.
 */
export function openIssues<T extends { status: string }>(issues: readonly T[]): T[] {
  return issues.filter((issue) => issue.status === "open");
}
