import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, getPlanLimits } from "../plans";

describe("PLAN_LIMITS", () => {
  it("matches PRD § 10 exactly", () => {
    expect(PLAN_LIMITS.trial).toEqual({ sites: 1, pagesPerSite: 5, scheduledScans: false });
    expect(PLAN_LIMITS.freelancer).toEqual({ sites: 5, pagesPerSite: 25, scheduledScans: false });
    expect(PLAN_LIMITS.agency_starter).toEqual({ sites: 25, pagesPerSite: 50, scheduledScans: true });
    expect(PLAN_LIMITS.agency_pro).toEqual({ sites: 75, pagesPerSite: 100, scheduledScans: true });
    expect(PLAN_LIMITS.agency_scale).toEqual({ sites: 150, pagesPerSite: 100, scheduledScans: true });
  });

  it("covers every plan", () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual(
      ["trial", "freelancer", "agency_starter", "agency_pro", "agency_scale"].sort()
    );
  });
});

describe("getPlanLimits", () => {
  it("returns limits for a known plan", () => {
    expect(getPlanLimits("agency_pro").sites).toBe(75);
  });

  it("falls back to trial for unknown plan strings", () => {
    expect(getPlanLimits("bogus")).toEqual(PLAN_LIMITS.trial);
  });
});
