import { describe, expect, it, vi } from "vitest";
import { SsrfError } from "@siteops/shared/safe-fetch";
import { checkLinks } from "../links";

const ORIGIN = "https://example.com";

function response(status: number): Response {
  return { status, body: null } as unknown as Response;
}

describe("checkLinks", () => {
  it("reports ≥400 responses as broken, labels internal vs external", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("dead")) return response(404);
      return response(200);
    });
    const broken = await checkLinks(
      ["https://example.com/ok", "https://example.com/dead", "https://other.com/dead"],
      ORIGIN,
      { fetchImpl: fetchImpl as never }
    );
    expect(broken).toEqual(
      expect.arrayContaining([
        { href: "https://example.com/dead", status: 404, internal: true },
        { href: "https://other.com/dead", status: 404, internal: false },
      ])
    );
    expect(broken).toHaveLength(2);
  });

  it("falls back to GET when HEAD returns 405", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (_url: string, opts?: { method?: string }) => {
      calls.push(opts?.method ?? "GET");
      return opts?.method === "HEAD" ? response(405) : response(200);
    });
    const broken = await checkLinks(["https://example.com/a"], ORIGIN, {
      fetchImpl: fetchImpl as never,
    });
    expect(calls).toEqual(["HEAD", "GET"]);
    expect(broken).toHaveLength(0);
  });

  it("treats network errors as broken with null status", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    const broken = await checkLinks(["https://example.com/x"], ORIGIN, {
      fetchImpl: fetchImpl as never,
    });
    expect(broken).toEqual([{ href: "https://example.com/x", status: null, internal: true }]);
  });

  it("skips SSRF-rejected targets instead of reporting them broken", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new SsrfError();
    });
    const broken = await checkLinks(["https://internal.example.com/x"], ORIGIN, {
      fetchImpl: fetchImpl as never,
    });
    expect(broken).toHaveLength(0);
  });

  it("dedupes and caps the number of links checked", async () => {
    const fetchImpl = vi.fn(async () => response(200));
    const hrefs = Array.from({ length: 150 }, (_, i) => `https://example.com/p${i}`);
    await checkLinks([...hrefs, ...hrefs], ORIGIN, { fetchImpl: fetchImpl as never });
    expect(fetchImpl).toHaveBeenCalledTimes(100);
  });

  it("respects the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const fetchImpl = vi.fn(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return response(200);
    });
    const hrefs = Array.from({ length: 20 }, (_, i) => `https://example.com/p${i}`);
    await checkLinks(hrefs, ORIGIN, { fetchImpl: fetchImpl as never, concurrency: 5 });
    expect(peak).toBeLessThanOrEqual(5);
  });
});
