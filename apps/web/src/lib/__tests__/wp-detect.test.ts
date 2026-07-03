import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const safeFetchMock = vi.hoisted(() => vi.fn());
vi.mock("../safe-fetch", () => ({ safeFetch: safeFetchMock }));

import { detectWordPress } from "../wp-detect";

const ORIGIN = "https://example.com";

function mockResponses({
  html,
  wpJson,
  homepageFails = false,
  wpJsonFails = false,
}: {
  html?: string;
  wpJson?: unknown;
  homepageFails?: boolean;
  wpJsonFails?: boolean;
}) {
  safeFetchMock.mockImplementation(async (url: string) => {
    if (url === ORIGIN) {
      if (homepageFails) throw new Error("network");
      return new Response(html ?? "<html></html>", { status: 200 });
    }
    if (url === `${ORIGIN}/wp-json/`) {
      if (wpJsonFails) throw new Error("network");
      if (wpJson === undefined) return new Response("nope", { status: 404 });
      return new Response(JSON.stringify(wpJson), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`unexpected url ${url}`);
  });
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("detectWordPress", () => {
  it("detects via /wp-content/ in homepage HTML", async () => {
    mockResponses({
      html: '<link rel="stylesheet" href="/wp-content/themes/x/style.css">',
    });
    const result = await detectWordPress(ORIGIN);
    expect(result.detection).toBe("detected");
    expect(result.signals.wpContent).toBe(true);
    expect(result.signals.wpJson).toBe(false);
  });

  it("detects via generator meta tag", async () => {
    mockResponses({
      html: '<meta name="generator" content="WordPress 6.5" />',
    });
    const result = await detectWordPress(ORIGIN);
    expect(result.detection).toBe("detected");
    expect(result.signals.generatorMeta).toBe(true);
  });

  it("detects via wp-json name field even when homepage has no markers", async () => {
    mockResponses({ html: "<html>plain</html>", wpJson: { name: "My Site" } });
    const result = await detectWordPress(ORIGIN);
    expect(result.detection).toBe("detected");
    expect(result.signals.wpJson).toBe(true);
  });

  it("returns not_detected for a readable non-WP site", async () => {
    mockResponses({ html: "<html>static site</html>" });
    const result = await detectWordPress(ORIGIN);
    expect(result.detection).toBe("not_detected");
    expect(result.signals).toEqual({
      wpContent: false,
      wpJson: false,
      generatorMeta: false,
    });
  });

  it("ignores wp-json responses without a name string", async () => {
    mockResponses({ html: "<html></html>", wpJson: { other: 1 } });
    const result = await detectWordPress(ORIGIN);
    expect(result.signals.wpJson).toBe(false);
    expect(result.detection).toBe("not_detected");
  });

  it("returns unknown when nothing is reachable, never throws", async () => {
    mockResponses({ homepageFails: true, wpJsonFails: true });
    const result = await detectWordPress(ORIGIN);
    expect(result.detection).toBe("unknown");
  });

  it("still detects when only one probe succeeds", async () => {
    mockResponses({ homepageFails: true, wpJson: { name: "My Site" } });
    const result = await detectWordPress(ORIGIN);
    expect(result.detection).toBe("detected");
  });
});
