import {
  classifyFinding,
  type Finding,
  type IssueType,
  type PageImportance,
  type Severity,
} from "@siteops/shared";
import type { FormDescriptor, CtaDescriptor } from "../extract";

// FR-011/FR-012: pure comparison of a page's baseline state against its scan
// capture. No I/O — fixture-testable. Only NEW problems become issues;
// problems already present in the baseline surface as info notes instead.

const MAX_LINK_ISSUES = 10;

export interface ConsoleErrorEntry {
  type: string;
  text: string;
  url: string | null;
}

export interface BrokenLinkEntry {
  href: string;
  status: number | null;
  internal?: boolean;
}

/** The comparison-relevant slice of a baselines row. */
export interface BaselineSnapshot {
  httpStatus: number | null;
  pageTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonicalUrl: string | null;
  consoleErrors: ConsoleErrorEntry[];
  brokenLinks: BrokenLinkEntry[];
  forms: FormDescriptor[];
  ctas: CtaDescriptor[];
}

/** The comparison-relevant slice of a scan capture. */
export interface ScanSnapshot extends BaselineSnapshot {
  missingImages: string[];
}

export interface IssueDraft {
  type: IssueType;
  severity: Severity;
  needsReview: boolean;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  recommendation: string | null;
}

export interface TechnicalComparison {
  issues: IssueDraft[];
  /** Pre-existing baseline problems — informational, never issues (FR-011). */
  infoNotes: string[];
}

// ── Normalization helpers ────────────────────────────────────────────────────

function normText(value: string | null): string | null {
  const t = value?.replace(/\s+/g, " ").trim();
  return t ? t : null;
}

/**
 * Normalize a console error for old-vs-new matching: case-folded, whitespace
 * collapsed, line/column suffixes and URLs stripped so a re-bundled asset
 * doesn't make every old error look new.
 */
export function normalizeErrorText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/:\d+(:\d+)?\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function is2xx(status: number | null): boolean {
  return status !== null && status >= 200 && status < 300;
}

function classify(finding: Finding, importance: PageImportance) {
  const result = classifyFinding(finding, importance);
  if (!result) throw new Error(`unexpected null classification for ${finding.type}`);
  return result;
}

// ── Comparison ───────────────────────────────────────────────────────────────

/**
 * Compare a page's baseline against its scan capture (FR-011 + FR-012) and
 * return severity-classified issue drafts ready for insertion, plus info
 * notes for problems the baseline already had.
 */
export function compareTechnical(
  baseline: BaselineSnapshot,
  scan: ScanSnapshot,
  importance: PageImportance = "normal"
): TechnicalComparison {
  const issues: IssueDraft[] = [];
  const infoNotes: string[] = [];

  compareStatus(baseline, scan, importance, issues, infoNotes);
  compareMetadata(baseline, scan, importance, issues, infoNotes);
  compareConsoleErrors(baseline, scan, importance, issues);
  compareBrokenLinks(baseline, scan, importance, issues, infoNotes);
  compareMissingImages(scan, importance, issues);
  compareForms(baseline, scan, importance, issues);
  compareCtas(baseline, scan, importance, issues);

  return { issues, infoNotes };
}

function compareStatus(
  baseline: BaselineSnapshot,
  scan: ScanSnapshot,
  importance: PageImportance,
  issues: IssueDraft[],
  infoNotes: string[]
): void {
  const before = baseline.httpStatus;
  const after = scan.httpStatus;
  if (before === after) {
    if (before !== null && !is2xx(before)) {
      infoNotes.push(`Page already returned HTTP ${before} at baseline (unchanged).`);
    }
    return;
  }

  const evidence = { before, after };
  if (is2xx(before) && after !== null && after >= 400) {
    const type: IssueType = after >= 500 ? "page_5xx" : "page_404";
    const { severity, needsReview } = classify({ type }, importance);
    issues.push({
      type,
      severity,
      needsReview,
      title:
        after >= 500
          ? `Page now returns a server error (HTTP ${after})`
          : `Page now returns HTTP ${after}`,
      description: `This page returned HTTP ${before} at baseline and now returns HTTP ${after}. Visitors may not be able to reach it.`,
      evidence,
      recommendation:
        "Check whether the page was unpublished, its permalink changed, or the server is erroring.",
    });
    return;
  }

  const { severity, needsReview } = classify(
    { type: "http_status_change", from: before, to: after },
    importance
  );
  issues.push({
    type: "http_status_change",
    severity,
    needsReview,
    title: `HTTP status changed: ${before ?? "none"} → ${after ?? "none"}`,
    description: `The page's HTTP status changed from ${before ?? "no response"} at baseline to ${after ?? "no response"}.`,
    evidence,
    recommendation: "Confirm the change is intentional (e.g. a new redirect).",
  });
}

const META_FIELDS = [
  {
    key: "pageTitle",
    label: "Title",
    changed: "title_changed",
    missing: "title_missing",
  },
  { key: "h1", label: "H1 heading", changed: "h1_changed", missing: "h1_missing" },
  {
    key: "metaDescription",
    label: "Meta description",
    changed: "meta_description_changed",
    missing: "meta_description_missing",
  },
  {
    key: "canonicalUrl",
    label: "Canonical URL",
    changed: "canonical_changed",
    missing: null,
  },
] as const;

function compareMetadata(
  baseline: BaselineSnapshot,
  scan: ScanSnapshot,
  importance: PageImportance,
  issues: IssueDraft[],
  infoNotes: string[]
): void {
  for (const field of META_FIELDS) {
    const before = normText(baseline[field.key]);
    const after = normText(scan[field.key]);
    if (before === null) {
      if (after === null) infoNotes.push(`${field.label} was already missing at baseline.`);
      continue; // pre-existing gap or newly added value — not a regression
    }
    if (after === before) continue;

    if (after === null && field.missing) {
      const { severity, needsReview } = classify({ type: field.missing }, importance);
      issues.push({
        type: field.missing,
        severity,
        needsReview,
        title: `${field.label} is now missing`,
        description: `The ${field.label.toLowerCase()} was present at baseline and is gone now.`,
        evidence: { before, after: null },
        recommendation: `Restore the ${field.label.toLowerCase()} — it matters for SEO and shareability.`,
      });
      continue;
    }

    const type = field.changed;
    const { severity, needsReview } = classify({ type }, importance);
    issues.push({
      type,
      severity,
      needsReview,
      title: `${field.label} changed`,
      description: `The ${field.label.toLowerCase()} changed since the baseline.`,
      evidence: { before, after },
      recommendation: "If this change was intentional, mark it as expected.",
    });
  }
}

function compareConsoleErrors(
  baseline: BaselineSnapshot,
  scan: ScanSnapshot,
  importance: PageImportance,
  issues: IssueDraft[]
): void {
  const known = new Set(baseline.consoleErrors.map((e) => normalizeErrorText(e.text)));
  const seen = new Set<string>();
  const fresh = scan.consoleErrors.filter((e) => {
    const norm = normalizeErrorText(e.text);
    if (known.has(norm) || seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
  if (fresh.length === 0) return;

  const hasUncaught = fresh.some((e) => e.text.includes("Uncaught"));
  const { severity, needsReview } = classify(
    { type: "console_error", newCount: fresh.length, hasUncaught },
    importance
  );
  issues.push({
    type: "console_error",
    severity,
    needsReview,
    title:
      fresh.length === 1
        ? "New JavaScript error on this page"
        : `${fresh.length} new JavaScript errors on this page`,
    description:
      "The browser reported JavaScript errors that were not present at baseline. Errors can break interactive features even when the page looks fine.",
    evidence: { errors: fresh.slice(0, 10).map((e) => ({ text: e.text, url: e.url })) },
    recommendation: "Check recently updated plugins or scripts for the source of these errors.",
  });
}

function compareBrokenLinks(
  baseline: BaselineSnapshot,
  scan: ScanSnapshot,
  importance: PageImportance,
  issues: IssueDraft[],
  infoNotes: string[]
): void {
  const known = new Set(baseline.brokenLinks.map((l) => l.href));
  let preExisting = 0;
  let emitted = 0;
  for (const link of scan.brokenLinks) {
    if (known.has(link.href)) {
      preExisting++;
      continue;
    }
    if (emitted >= MAX_LINK_ISSUES) continue;
    emitted++;
    const internal = link.internal ?? true;
    const { severity, needsReview } = classify({ type: "broken_link", internal }, importance);
    issues.push({
      type: "broken_link",
      severity,
      needsReview,
      title: `New broken ${internal ? "internal" : "external"} link`,
      description: `A link on this page now fails to load (${link.status ?? "no response"}).`,
      evidence: { link: link.href, status: link.status, internal },
      recommendation: internal
        ? "Fix or remove the link — the target page may have been deleted or renamed."
        : "Check whether the external destination moved or is temporarily down.",
    });
  }
  if (preExisting > 0) {
    infoNotes.push(
      `${preExisting} broken link${preExisting === 1 ? "" : "s"} already present at baseline (unchanged).`
    );
  }
}

function compareMissingImages(
  scan: ScanSnapshot,
  importance: PageImportance,
  issues: IssueDraft[]
): void {
  if (scan.missingImages.length === 0) return;
  const { severity, needsReview } = classify({ type: "missing_image" }, importance);
  issues.push({
    type: "missing_image",
    severity,
    needsReview,
    title:
      scan.missingImages.length === 1
        ? "An image on this page fails to load"
        : `${scan.missingImages.length} images on this page fail to load`,
    description: "One or more images did not load during the scan.",
    evidence: { images: scan.missingImages.slice(0, 20) },
    recommendation: "Check whether the image files were moved or deleted from the media library.",
  });
}

function compareForms(
  baseline: BaselineSnapshot,
  scan: ScanSnapshot,
  importance: PageImportance,
  issues: IssueDraft[]
): void {
  for (const before of baseline.forms) {
    const after = scan.forms.find((f) => f.selector === before.selector);
    if (!after) {
      const { severity, needsReview } = classify({ type: "form_missing" }, importance);
      issues.push({
        type: "form_missing",
        severity,
        needsReview,
        title: "A form disappeared from this page",
        description:
          "A form that existed at baseline is no longer detected. If this is a contact or lead form, submissions may be silently lost.",
        evidence: {
          before: { selector: before.selector, fieldCount: before.fieldCount, plugin: before.plugin },
          after: null,
        },
        recommendation:
          "Check the form plugin — a plugin update or deactivation is the most common cause.",
      });
      continue;
    }
    const fieldsDropped = after.fieldCount < before.fieldCount;
    const submitLost = before.hasSubmit && !after.hasSubmit;
    if (fieldsDropped || submitLost) {
      const { severity, needsReview } = classify({ type: "form_changed" }, importance);
      issues.push({
        type: "form_changed",
        severity,
        needsReview,
        title: submitLost ? "A form lost its submit button" : "A form lost fields",
        description: submitLost
          ? "A form on this page no longer has a submit button — visitors cannot send it."
          : `A form dropped from ${before.fieldCount} to ${after.fieldCount} fields since baseline.`,
        evidence: {
          before: { selector: before.selector, fieldCount: before.fieldCount, hasSubmit: before.hasSubmit },
          after: { selector: after.selector, fieldCount: after.fieldCount, hasSubmit: after.hasSubmit },
        },
        recommendation: "Open the page and try the form; check the form plugin's settings.",
      });
    }
  }
}

function compareCtas(
  baseline: BaselineSnapshot,
  scan: ScanSnapshot,
  importance: PageImportance,
  issues: IssueDraft[]
): void {
  const scanTexts = new Set(scan.ctas.map((c) => normText(c.text)?.toLowerCase()));
  const scanHrefs = new Set(scan.ctas.map((c) => c.href).filter(Boolean));
  for (const cta of baseline.ctas.slice(0, 5)) {
    const text = normText(cta.text)?.toLowerCase();
    const stillThere = (text && scanTexts.has(text)) || (cta.href && scanHrefs.has(cta.href));
    if (stillThere) continue;
    const { severity, needsReview } = classify({ type: "cta_missing" }, importance);
    issues.push({
      type: "cta_missing",
      severity,
      needsReview,
      title: `Call-to-action "${cta.text}" is missing`,
      description:
        "A prominent button or link from the baseline is no longer on the page. If it drove signups or contact, that path is broken.",
      evidence: { before: { text: cta.text, href: cta.href }, after: null },
      recommendation: "Check the page content and theme — the button may have been removed by an update.",
    });
  }
}
