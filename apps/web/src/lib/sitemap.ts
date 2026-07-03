import { XMLParser } from "fast-xml-parser";
import { isSameOrigin, normalizePageUrl } from "@siteops/shared";
import { safeFetch } from "@/lib/safe-fetch";

export interface DiscoveredPage {
  url: string;
  lastmod?: string;
}

export interface SitemapResult {
  pages: DiscoveredPage[];
  source: "sitemap" | "none";
  truncated: boolean;
}

const SITEMAP_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"];
const MAX_PAGES = 500;
const MAX_CHILD_SITEMAPS = 10;
const TOTAL_BUDGET_MS = 15_000;

const parser = new XMLParser({ ignoreAttributes: true });

type UrlEntry = { loc?: unknown; lastmod?: unknown };

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Discover pages from a site's sitemap (FR-004). Tries the common WP sitemap
 * locations in order, follows sitemap indexes one level deep (max 10
 * children), same-origin filter, dedupe, cap 500. Never throws — a site with
 * no readable sitemap returns `{ pages: [], source: "none" }`.
 */
export async function discoverPagesFromSitemap(
  origin: string
): Promise<SitemapResult> {
  const controller = new AbortController();
  const budget = setTimeout(() => controller.abort(), TOTAL_BUDGET_MS);
  try {
    for (const path of SITEMAP_PATHS) {
      const xml = await fetchXml(`${origin}${path}`, controller.signal);
      if (!xml) continue;
      const result = await parseSitemap(xml, origin, controller.signal);
      if (result.pages.length > 0) {
        return { ...result, source: "sitemap" };
      }
    }
    return { pages: [], source: "none", truncated: false };
  } catch {
    return { pages: [], source: "none", truncated: false };
  } finally {
    clearTimeout(budget);
  }
}

async function fetchXml(
  url: string,
  signal: AbortSignal
): Promise<string | null> {
  try {
    const res = await safeFetch(url, { signal });
    if (!res.ok) return null;
    const text = await res.text();
    return text.includes("<") ? text : null;
  } catch {
    return null;
  }
}

async function parseSitemap(
  xml: string,
  origin: string,
  signal: AbortSignal
): Promise<{ pages: DiscoveredPage[]; truncated: boolean }> {
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml);
  } catch {
    return { pages: [], truncated: false };
  }

  const seen = new Set<string>();
  const pages: DiscoveredPage[] = [];
  let truncated = false;

  const collect = (entries: UrlEntry[]) => {
    for (const entry of entries) {
      if (pages.length >= MAX_PAGES) {
        truncated = true;
        return;
      }
      if (typeof entry?.loc !== "string") continue;
      let normalized: string;
      try {
        normalized = normalizePageUrl(entry.loc.trim());
      } catch {
        continue;
      }
      if (!isSameOrigin(normalized, origin)) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      pages.push({
        url: normalized,
        lastmod:
          typeof entry.lastmod === "string" ? entry.lastmod : undefined,
      });
    }
  };

  const urlset = doc["urlset"] as { url?: UrlEntry | UrlEntry[] } | undefined;
  if (urlset) {
    collect(asArray(urlset.url));
    return { pages, truncated };
  }

  const index = doc["sitemapindex"] as
    | { sitemap?: UrlEntry | UrlEntry[] }
    | undefined;
  if (index) {
    const children = asArray(index.sitemap)
      .map((s) => (typeof s?.loc === "string" ? s.loc.trim() : null))
      .filter((loc): loc is string => !!loc && isSameOrigin(loc, origin))
      .slice(0, MAX_CHILD_SITEMAPS);

    for (const childUrl of children) {
      if (pages.length >= MAX_PAGES) break;
      const childXml = await fetchXml(childUrl, signal);
      if (!childXml) continue;
      let childDoc: Record<string, unknown>;
      try {
        childDoc = parser.parse(childXml);
      } catch {
        continue;
      }
      const childUrlset = childDoc["urlset"] as
        | { url?: UrlEntry | UrlEntry[] }
        | undefined;
      if (childUrlset) collect(asArray(childUrlset.url));
    }
  }
  return { pages, truncated };
}
