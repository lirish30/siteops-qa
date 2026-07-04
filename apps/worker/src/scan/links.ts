import { safeFetch, SsrfError } from "@siteops/shared/safe-fetch";

export interface BrokenLink {
  href: string;
  status: number | null; // null = network error / timeout
  internal: boolean;
}

export interface LinkCheckOptions {
  concurrency?: number;
  timeoutMs?: number;
  maxLinks?: number;
  /** Injectable for tests. Defaults to the shared SSRF-guarded fetch. */
  fetchImpl?: typeof safeFetch;
}

/**
 * Check links with HEAD (GET fallback on 405), concurrency 5, 10s timeout
 * each, cap 100/page (FR-006). ≥400 or network error = broken. External
 * links are checked too but labeled. SSRF guard applies to every request —
 * a link pointing at a private address is skipped, not reported broken.
 */
export async function checkLinks(
  hrefs: string[],
  pageOrigin: string,
  options: LinkCheckOptions = {}
): Promise<BrokenLink[]> {
  const {
    concurrency = 5,
    timeoutMs = 10_000,
    maxLinks = 100,
    fetchImpl = safeFetch,
  } = options;

  const unique = [...new Set(hrefs)].slice(0, maxLinks);
  const broken: BrokenLink[] = [];

  async function checkOne(href: string): Promise<void> {
    const internal = isInternal(href, pageOrigin);
    let status: number | null = null;
    try {
      let res = await fetchImpl(href, { method: "HEAD", timeoutMs });
      if (res.status === 405) {
        res = await fetchImpl(href, { method: "GET", timeoutMs });
      }
      res.body?.cancel().catch(() => undefined);
      status = res.status;
      if (status < 400) return;
    } catch (err) {
      if (err instanceof SsrfError) return; // unsafe target: skip, don't report
      status = null;
    }
    broken.push({ href, status, internal });
  }

  // Simple worker pool.
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, unique.length) }, async () => {
    while (next < unique.length) {
      const href = unique[next++];
      await checkOne(href);
    }
  });
  await Promise.all(workers);

  return broken;
}

function isInternal(href: string, pageOrigin: string): boolean {
  try {
    return new URL(href).origin === new URL(pageOrigin).origin;
  } catch {
    return false;
  }
}
