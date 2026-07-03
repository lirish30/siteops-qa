import { lookup } from "node:dns/promises";
import {
  isAllowedPort,
  isForbiddenHostname,
  isIpLiteral,
  isPrivateAddress,
} from "./url";

export class SsrfError extends Error {
  constructor(message = "URL points somewhere we can't reach safely") {
    super(message);
    this.name = "SsrfError";
  }
}

const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Validate a URL against the SSRF policy (PRD § 2 Security): http/https only,
 * ports 80/443 only, and the host must not resolve to a private/reserved
 * address. Throws SsrfError when the URL is not safe to fetch.
 */
export async function assertPublicUrl(rawUrl: string | URL): Promise<URL> {
  const url = typeof rawUrl === "string" ? new URL(rawUrl) : rawUrl;
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("Only http and https URLs are supported");
  }
  if (!isAllowedPort(url)) {
    throw new SsrfError("Only ports 80 and 443 are supported");
  }
  if (isForbiddenHostname(url.hostname)) {
    throw new SsrfError();
  }
  if (!isIpLiteral(url.hostname)) {
    let addresses;
    try {
      addresses = await lookup(url.hostname, { all: true, verbatim: true });
    } catch {
      throw new SsrfError("We couldn't find that host");
    }
    if (addresses.length === 0) throw new SsrfError("We couldn't find that host");
    if (addresses.some((a) => isPrivateAddress(a.address))) {
      throw new SsrfError();
    }
  }
  return url;
}

export interface SafeFetchOptions {
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * fetch() with SSRF protection: every hop (initial URL and each redirect,
 * max 3) is re-validated against private/reserved ranges before it is
 * fetched. 15s total timeout by default. Never sends bodies — scans and
 * detection are read-only GET/HEAD by product principle.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const signal = options.signal
    ? AbortSignal.any([timeout, options.signal])
    : timeout;

  let url = await assertPublicUrl(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "user-agent": "SiteOpsQA-Bot/1.0 (+https://siteopsqa.com/bot)",
        ...options.headers,
      },
      redirect: "manual",
      signal,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;
      response.body?.cancel();
      if (hop === MAX_REDIRECTS) {
        throw new SsrfError("Too many redirects");
      }
      url = await assertPublicUrl(new URL(location, url));
      continue;
    }
    return response;
  }
  // Unreachable — loop always returns or throws.
  throw new SsrfError("Too many redirects");
}
