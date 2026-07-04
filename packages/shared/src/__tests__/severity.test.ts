import { describe, expect, it } from "vitest";
import {
  classifyFinding,
  overallVerdict,
  worstSeverity,
  VISUAL_THRESHOLDS,
  type Finding,
} from "../severity";

const visual = (ratio: number, foldRatio = 0): Finding => ({
  type: "visual_change_desktop",
  ratio,
  foldRatio,
});

describe("classifyFinding — visual bands (FR-010)", () => {
  it("below 0.5% creates no issue", () => {
    expect(classifyFinding(visual(0))).toBeNull();
    expect(classifyFinding(visual(0.0049))).toBeNull();
  });

  it("0.5–3% → low, no review", () => {
    expect(classifyFinding(visual(0.005))).toEqual({ severity: "low", needsReview: false });
    expect(classifyFinding(visual(0.03))).toEqual({ severity: "low", needsReview: false });
  });

  it("3–10% → medium, no review", () => {
    expect(classifyFinding(visual(0.031))).toEqual({ severity: "medium", needsReview: false });
    expect(classifyFinding(visual(0.1))).toEqual({ severity: "medium", needsReview: false });
  });

  it("> 10% → high + needs_review", () => {
    expect(classifyFinding(visual(0.101))).toEqual({ severity: "high", needsReview: true });
    expect(classifyFinding(visual(0.25))).toEqual({ severity: "high", needsReview: true });
  });

  it("> 25% → critical + needs_review", () => {
    expect(classifyFinding(visual(0.251))).toEqual({ severity: "critical", needsReview: true });
    expect(classifyFinding(visual(0.9))).toEqual({ severity: "critical", needsReview: true });
  });

  it("above-the-fold concentration escalates >10% to critical", () => {
    expect(classifyFinding(visual(0.12, 0.3))).toEqual({
      severity: "critical",
      needsReview: true,
    });
    // Fold concentration alone does not escalate small overall diffs.
    expect(classifyFinding(visual(0.02, 0.5))).toEqual({ severity: "low", needsReview: false });
  });

  it("mobile viewport uses the same bands", () => {
    expect(classifyFinding({ type: "visual_change_mobile", ratio: 0.05, foldRatio: 0 })).toEqual({
      severity: "medium",
      needsReview: false,
    });
  });
});

describe("classifyFinding — HTTP status (FR-011)", () => {
  it("page newly 404 → critical + review", () => {
    expect(classifyFinding({ type: "page_404" })).toEqual({
      severity: "critical",
      needsReview: true,
    });
  });

  it("page newly 500 → critical + review (§ 23 eval case)", () => {
    expect(classifyFinding({ type: "page_5xx" })).toEqual({
      severity: "critical",
      needsReview: true,
    });
  });

  it("other status changes → high; review when new status is 4xx/5xx", () => {
    expect(classifyFinding({ type: "http_status_change", from: 200, to: 301 })).toEqual({
      severity: "high",
      needsReview: false,
    });
    expect(classifyFinding({ type: "http_status_change", from: 200, to: 403 })).toEqual({
      severity: "high",
      needsReview: true,
    });
    expect(classifyFinding({ type: "http_status_change", from: 200, to: null })).toEqual({
      severity: "high",
      needsReview: true,
    });
  });
});

describe("classifyFinding — metadata (FR-011)", () => {
  it.each([
    "title_changed",
    "h1_changed",
    "meta_description_changed",
    "canonical_changed",
  ] as const)("%s → medium", (type) => {
    expect(classifyFinding({ type })).toEqual({ severity: "medium", needsReview: false });
  });

  it("title/h1 now missing → high", () => {
    expect(classifyFinding({ type: "title_missing" })).toEqual({
      severity: "high",
      needsReview: false,
    });
    expect(classifyFinding({ type: "h1_missing" })).toEqual({
      severity: "high",
      needsReview: false,
    });
  });

  it("meta description now missing → medium", () => {
    expect(classifyFinding({ type: "meta_description_missing" })).toEqual({
      severity: "medium",
      needsReview: false,
    });
  });
});

describe("classifyFinding — console errors, links, images (FR-011)", () => {
  it("new console errors → medium", () => {
    expect(classifyFinding({ type: "console_error", newCount: 1, hasUncaught: false })).toEqual({
      severity: "medium",
      needsReview: false,
    });
  });

  it("more than 3 new errors or Uncaught → high", () => {
    expect(classifyFinding({ type: "console_error", newCount: 4, hasUncaught: false })).toEqual({
      severity: "high",
      needsReview: false,
    });
    expect(classifyFinding({ type: "console_error", newCount: 1, hasUncaught: true })).toEqual({
      severity: "high",
      needsReview: false,
    });
  });

  it("broken links: internal medium, external low", () => {
    expect(classifyFinding({ type: "broken_link", internal: true })).toEqual({
      severity: "medium",
      needsReview: false,
    });
    expect(classifyFinding({ type: "broken_link", internal: false })).toEqual({
      severity: "low",
      needsReview: false,
    });
  });

  it("missing image → medium", () => {
    expect(classifyFinding({ type: "missing_image" })).toEqual({
      severity: "medium",
      needsReview: false,
    });
  });
});

describe("classifyFinding — forms & CTAs (FR-012)", () => {
  it("form disappeared → critical + review (§ 23 eval case)", () => {
    expect(classifyFinding({ type: "form_missing" })).toEqual({
      severity: "critical",
      needsReview: true,
    });
  });

  it("form changed (fields dropped / submit missing) → high", () => {
    expect(classifyFinding({ type: "form_changed" })).toEqual({
      severity: "high",
      needsReview: false,
    });
  });

  it("cta missing: page-importance escalation (§ 23 eval case)", () => {
    expect(classifyFinding({ type: "cta_missing" }, "critical")).toEqual({
      severity: "high",
      needsReview: true,
    });
    expect(classifyFinding({ type: "cta_missing" }, "normal")).toEqual({
      severity: "medium",
      needsReview: true,
    });
  });
});

describe("classifyFinding — scan failures (PRD § 11)", () => {
  it("page failed to scan → high + needs_review", () => {
    expect(classifyFinding({ type: "scan_page_failed" })).toEqual({
      severity: "high",
      needsReview: true,
    });
  });
});

describe("worstSeverity / overallVerdict", () => {
  it("orders severities correctly", () => {
    expect(worstSeverity("low", "high")).toBe("high");
    expect(worstSeverity("critical", "info")).toBe("critical");
    expect(worstSeverity("medium", "medium")).toBe("medium");
  });

  it("overallVerdict is pass for no issues, worst otherwise", () => {
    expect(overallVerdict([])).toBe("pass");
    expect(overallVerdict(["low", "medium", "info"])).toBe("medium");
    expect(overallVerdict(["high", "critical"])).toBe("critical");
  });
});

describe("threshold constants stay in sync with the FR-010 bands", () => {
  it("exposes the documented values", () => {
    expect(VISUAL_THRESHOLDS).toEqual({
      none: 0.005,
      low: 0.03,
      medium: 0.1,
      critical: 0.25,
      foldCritical: 0.25,
    });
  });
});
