import { VerdictBanner as BaseVerdictBanner } from "@/components/ui/banner";
import type { Verdict } from "@siteops/shared";

type ScanStatus = "queued" | "running" | "complete" | "failed";

export function ScanVerdictBanner({
  status,
  verdict,
  openIssueCount,
  pagesDone,
  pagesTotal,
}: {
  status: ScanStatus;
  verdict: Verdict;
  openIssueCount: number;
  pagesDone: number;
  pagesTotal: number;
}) {
  if (status === "queued" || status === "running") {
    return (
      <BaseVerdictBanner verdict="review">
        Checking {pagesTotal} page{pagesTotal === 1 ? "" : "s"} - {pagesDone} done.
        Results will fill in as each page finishes.
      </BaseVerdictBanner>
    );
  }

  if (status === "failed") {
    return (
      <BaseVerdictBanner verdict="fail">
        Scan failed. Any page-level results captured before the failure are still shown
        below.
      </BaseVerdictBanner>
    );
  }

  if (verdict === "pass") {
    return (
      <BaseVerdictBanner verdict="pass">
        No issues found. The checked pages still match the baseline closely.
      </BaseVerdictBanner>
    );
  }

  if (verdict === "critical" || verdict === "high") {
    return (
      <BaseVerdictBanner verdict="fail">
        Issues found. {openIssueCount} open finding
        {openIssueCount === 1 ? "" : "s"} need review before you notify your client.
      </BaseVerdictBanner>
    );
  }

  if (verdict === "medium") {
    return (
      <BaseVerdictBanner verdict="review">
        Needs review. {openIssueCount} change{openIssueCount === 1 ? "" : "s"} may be
        intentional, but should be checked.
      </BaseVerdictBanner>
    );
  }

  return (
    <BaseVerdictBanner verdict="pass">
      No major issues found. {openIssueCount} minor note
      {openIssueCount === 1 ? "" : "s"} were flagged for awareness.
    </BaseVerdictBanner>
  );
}
