import { beforeEach, describe, expect, it, vi } from "vitest";

const safeFetchMock = vi.hoisted(() => vi.fn());
vi.mock("../safe-fetch", () => ({ safeFetch: safeFetchMock }));

import { discoverPagesFromSitemap } from "../sitemap";

const ORIGIN = "https://example.com";

const PLAIN_SITEMAP = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc><lastmod>2026-01-01</lastmod></url>
  <url><loc>https://example.com/about/</loc></url>
  <url><loc>https://example.com/about</loc></url>
  <url><loc>https://other.com/external</loc></url>
</urlset>`;

const SITEMAP_INDEX = `<?xml version="1.0"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/page-sitemap.xml</loc></sitemap>
  <sitemap><loc>https://example.com/post-sitemap.xml</loc></sitemap>
</sitemapindex>`;

const PAGE_CHILD = `<urlset>
  <url><loc>https://example.com/contact</loc></url>
</urlset>`;

const POST_CHILD = `<urlset>
  <url><loc>https://example.com/blog/post-1</loc></url>
  <url><loc>https://example.com/contact</loc></url>
</urlset>`;

function route(routes: Record<string, string | number>) {
  safeFetchMock.mockImplementation(async (url: string) => {
    const hit = routes[url];
    if (hit === undefined) return new Response("not found", { status: 404 });
    if (typeof hit === "number") return new Response(null, { status: hit });
    return new Response(hit, { status: 200 });
  });
}

beforeEach(() => vi.clearAllMocks());

describe("discoverPagesFromSitemap", () => {
  it("parses a plain sitemap: same-origin filter, trailing-slash dedupe, lastmod", async () => {
    route({ [`${ORIGIN}/sitemap.xml`]: PLAIN_SITEMAP });
    const result = await discoverPagesFromSitemap(ORIGIN);
    expect(result.source).toBe("sitemap");
    expect(result.pages).toEqual([
      { url: "https://example.com/", lastmod: "2026-01-01" },
      { url: "https://example.com/about", lastmod: undefined },
    ]);
  });

  it("falls through the path list to wp-sitemap.xml (Yoast/core layouts)", async () => {
    route({ [`${ORIGIN}/wp-sitemap.xml`]: PLAIN_SITEMAP });
    const result = await discoverPagesFromSitemap(ORIGIN);
    expect(result.source).toBe("sitemap");
    expect(result.pages.length).toBe(2);
  });

  it("follows a sitemap index one level deep and dedupes across children", async () => {
    route({
      [`${ORIGIN}/sitemap.xml`]: SITEMAP_INDEX,
      [`${ORIGIN}/page-sitemap.xml`]: PAGE_CHILD,
      [`${ORIGIN}/post-sitemap.xml`]: POST_CHILD,
    });
    const result = await discoverPagesFromSitemap(ORIGIN);
    expect(result.pages.map((p) => p.url)).toEqual([
      "https://example.com/contact",
      "https://example.com/blog/post-1",
    ]);
  });

  it("returns source none when no sitemap exists — never throws", async () => {
    route({});
    const result = await discoverPagesFromSitemap(ORIGIN);
    expect(result).toEqual({ pages: [], source: "none", truncated: false });
  });

  it("returns none on unparseable XML", async () => {
    route({ [`${ORIGIN}/sitemap.xml`]: "<<<< not xml" });
    const result = await discoverPagesFromSitemap(ORIGIN);
    expect(result.source).toBe("none");
  });

  it("caps at 500 URLs and flags truncation", async () => {
    const urls = Array.from(
      { length: 600 },
      (_, i) => `<url><loc>https://example.com/p${i}</loc></url>`
    ).join("");
    route({ [`${ORIGIN}/sitemap.xml`]: `<urlset>${urls}</urlset>` });
    const result = await discoverPagesFromSitemap(ORIGIN);
    expect(result.pages.length).toBe(500);
    expect(result.truncated).toBe(true);
  });

  it("handles a single-url sitemap (non-array parse shape)", async () => {
    route({
      [`${ORIGIN}/sitemap.xml`]: `<urlset><url><loc>https://example.com/only</loc></url></urlset>`,
    });
    const result = await discoverPagesFromSitemap(ORIGIN);
    expect(result.pages).toEqual([
      { url: "https://example.com/only", lastmod: undefined },
    ]);
  });
});
