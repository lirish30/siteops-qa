import { describe, expect, it } from "vitest";
import {
  compareTechnical,
  normalizeErrorText,
  type BaselineSnapshot,
  type ScanSnapshot,
} from "../technical";

const base = (overrides: Partial<BaselineSnapshot> = {}): BaselineSnapshot => ({
  httpStatus: 200,
  pageTitle: "Acme Plumbing — Home",
  metaDescription: "Plumbers in Springfield.",
  h1: "Springfield's trusted plumbers",
  canonicalUrl: "https://acme.test/",
  consoleErrors: [],
  brokenLinks: [],
  forms: [],
  ctas: [],
  ...overrides,
});

const scan = (overrides: Partial<ScanSnapshot> = {}): ScanSnapshot => ({
  ...base(),
  missingImages: [],
  ...overrides,
});

const types = (b: BaselineSnapshot, s: ScanSnapshot, importance?: "critical" | "normal") =>
  compareTechnical(b, s, importance).issues.map((i) => i.type);

describe("compareTechnical — HTTP status (FR-011)", () => {
  it("no change → no issues", () => {
    expect(types(base(), scan())).toEqual([]);
  });

  it("200 → 404 emits critical page_404 with needs_review", () => {
    const { issues } = compareTechnical(base(), scan({ httpStatus: 404 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      type: "page_404",
      severity: "critical",
      needsReview: true,
      evidence: { before: 200, after: 404 },
    });
  });

  it("200 → 500 emits critical page_5xx", () => {
    const { issues } = compareTechnical(base(), scan({ httpStatus: 500 }));
    expect(issues[0]).toMatchObject({ type: "page_5xx", severity: "critical" });
  });

  it("other transitions emit high http_status_change", () => {
    const { issues } = compareTechnical(base(), scan({ httpStatus: 301 }));
    expect(issues[0]).toMatchObject({
      type: "http_status_change",
      severity: "high",
      needsReview: false,
    });
  });

  it("pre-existing non-2xx unchanged → info note, no issue", () => {
    const result = compareTechnical(base({ httpStatus: 404 }), scan({ httpStatus: 404 }));
    expect(result.issues).toEqual([]);
    expect(result.infoNotes).toHaveLength(1);
  });
});

describe("compareTechnical — metadata (FR-011)", () => {
  it("changed title/h1/meta/canonical → medium issues with before/after evidence", () => {
    const s = scan({
      pageTitle: "New Title",
      h1: "New H1",
      metaDescription: "New description.",
      canonicalUrl: "https://acme.test/new",
    });
    const { issues } = compareTechnical(base(), s);
    expect(issues.map((i) => i.type).sort()).toEqual([
      "canonical_changed",
      "h1_changed",
      "meta_description_changed",
      "title_changed",
    ]);
    expect(issues.every((i) => i.severity === "medium")).toBe(true);
    expect(issues[0].evidence).toHaveProperty("before");
    expect(issues[0].evidence).toHaveProperty("after");
  });

  it("now-missing title → high title_missing (not title_changed)", () => {
    const { issues } = compareTechnical(base(), scan({ pageTitle: null }));
    expect(issues[0]).toMatchObject({ type: "title_missing", severity: "high" });
  });

  it("now-missing meta description → medium", () => {
    const { issues } = compareTechnical(base(), scan({ metaDescription: "  " }));
    expect(issues[0]).toMatchObject({ type: "meta_description_missing", severity: "medium" });
  });

  it("baseline already missing a field → info note, never an issue", () => {
    const result = compareTechnical(base({ h1: null }), scan({ h1: null }));
    expect(result.issues).toEqual([]);
    expect(result.infoNotes.some((n) => n.includes("H1"))).toBe(true);
  });

  it("whitespace-only differences are not changes", () => {
    const s = scan({ pageTitle: "  Acme   Plumbing — Home  " });
    expect(types(base(), s)).toEqual([]);
  });
});

describe("compareTechnical — console errors (FR-011)", () => {
  const err = (text: string) => ({ type: "console", text, url: null });

  it("only NEW errors count, matched by normalized text", () => {
    const b = base({
      consoleErrors: [err("Failed to load https://acme.test/old.js:12:3 something")],
    });
    // Same error, different URL + line numbers → still known.
    const s = scan({
      consoleErrors: [err("Failed to load https://acme.test/old.v2.js:99:1 something")],
    });
    expect(types(b, s)).toEqual([]);
  });

  it("a genuinely new error → medium console_error", () => {
    const s = scan({ consoleErrors: [err("TypeError: x is not a function")] });
    const { issues } = compareTechnical(base(), s);
    expect(issues[0]).toMatchObject({ type: "console_error", severity: "medium" });
  });

  it("Uncaught or >3 new errors → high", () => {
    const s1 = scan({ consoleErrors: [err("Uncaught ReferenceError: foo is not defined")] });
    expect(compareTechnical(base(), s1).issues[0].severity).toBe("high");

    const s2 = scan({ consoleErrors: [err("e1"), err("e2"), err("e3"), err("e4")] });
    expect(compareTechnical(base(), s2).issues[0].severity).toBe("high");
  });
});

describe("compareTechnical — broken links & images (FR-011)", () => {
  it("new broken internal link → medium; external → low", () => {
    const s = scan({
      brokenLinks: [
        { href: "https://acme.test/gone", status: 404, internal: true },
        { href: "https://other.test/gone", status: 404, internal: false },
      ],
    });
    const { issues } = compareTechnical(base(), s);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatchObject({ type: "broken_link", severity: "medium" });
    expect(issues[1]).toMatchObject({ type: "broken_link", severity: "low" });
  });

  it("pre-existing broken links → info note only", () => {
    const link = { href: "https://acme.test/gone", status: 404, internal: true };
    const result = compareTechnical(base({ brokenLinks: [link] }), scan({ brokenLinks: [link] }));
    expect(result.issues).toEqual([]);
    expect(result.infoNotes).toHaveLength(1);
  });

  it("missing images → one aggregated medium issue", () => {
    const s = scan({ missingImages: ["https://acme.test/a.jpg", "https://acme.test/b.jpg"] });
    const { issues } = compareTechnical(base(), s);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ type: "missing_image", severity: "medium" });
  });
});

describe("compareTechnical — forms & CTAs (FR-012)", () => {
  const form = { selector: "#contact", fieldCount: 4, hasSubmit: true, plugin: "cf7" as const };

  it("form disappeared → critical form_missing + needs_review", () => {
    const { issues } = compareTechnical(base({ forms: [form] }), scan({ forms: [] }));
    expect(issues[0]).toMatchObject({
      type: "form_missing",
      severity: "critical",
      needsReview: true,
    });
  });

  it("field count dropped → high form_changed", () => {
    const s = scan({ forms: [{ ...form, fieldCount: 2 }] });
    const { issues } = compareTechnical(base({ forms: [form] }), s);
    expect(issues[0]).toMatchObject({ type: "form_changed", severity: "high" });
  });

  it("submit button lost → high form_changed", () => {
    const s = scan({ forms: [{ ...form, hasSubmit: false }] });
    const { issues } = compareTechnical(base({ forms: [form] }), s);
    expect(issues[0].title).toContain("submit");
  });

  it("unchanged form → no issue", () => {
    expect(types(base({ forms: [form] }), scan({ forms: [form] }))).toEqual([]);
  });

  it("missing top-5 CTA → severity modulated by page importance", () => {
    const cta = { selector: "a.btn", text: "Get a quote", href: "https://acme.test/quote" };
    const b = base({ ctas: [cta] });
    expect(compareTechnical(b, scan(), "critical").issues[0]).toMatchObject({
      type: "cta_missing",
      severity: "high",
      needsReview: true,
    });
    expect(compareTechnical(b, scan(), "normal").issues[0]).toMatchObject({
      type: "cta_missing",
      severity: "medium",
    });
  });

  it("CTA surviving with same text but new selector still counts as present", () => {
    const b = base({ ctas: [{ selector: "a.btn", text: "Get a quote", href: null }] });
    const s = scan({ ctas: [{ selector: "a.button-new", text: "Get a  quote ", href: null }] });
    expect(types(b, s)).toEqual([]);
  });
});

describe("normalizeErrorText", () => {
  it("strips URLs, line/col numbers, and whitespace noise", () => {
    expect(normalizeErrorText("Error at https://x.test/app.js:10:5   loading")).toBe(
      "error at <url> loading"
    );
  });
});
