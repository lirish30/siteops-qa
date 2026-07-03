import { describe, expect, it } from "vitest";
import { safeNextPath } from "../safe-next";

describe("safeNextPath", () => {
  it("allows same-site absolute paths", () => {
    expect(safeNextPath("/sites/abc")).toBe("/sites/abc");
  });

  it("falls back for absolute URLs", () => {
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
  });

  it("falls back for protocol-relative URLs", () => {
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
  });

  it("falls back for backslash tricks", () => {
    expect(safeNextPath("/\\evil.com")).toBe("/dashboard");
  });

  it("falls back for empty or missing values", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
    expect(safeNextPath("dashboard")).toBe("/dashboard");
  });
});
