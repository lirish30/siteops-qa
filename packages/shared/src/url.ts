// URL normalization + SSRF address checks (PRD § 2 Security).
// Pure logic only — DNS resolution lives in the fetch layer (safe-fetch.ts)
// so both web and worker can reuse these checks.

/**
 * Normalize a user-supplied site URL to its origin:
 * trim, add https:// if missing, strip path/query/hash, lowercase host.
 * Throws on unparseable input or non-http(s) schemes.
 */
export function normalizeSiteUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("URL is empty");
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error("URL is not valid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported");
  }
  if (!url.hostname || !url.hostname.includes(".")) {
    throw new Error("URL needs a full hostname");
  }
  if (!isAllowedPort(url)) {
    throw new Error("Only ports 80 and 443 are supported");
  }
  // URL lowercases the hostname already; origin drops path/query/hash.
  return url.origin;
}

/** Only http/https on their default ports (80/443) are allowed. */
export function isAllowedPort(url: URL): boolean {
  if (url.port === "") return true; // default port for scheme
  return (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  );
}

/**
 * True when the IP address (v4 or v6) is private/reserved and must never be
 * fetched: 10.x, 172.16–31.x, 192.168.x, 127.x, 169.254.x, 0.x, ::1,
 * unique-local (fc00::/7), link-local (fe80::/10), and v4-mapped forms.
 */
export function isPrivateAddress(address: string): boolean {
  const ip = address.trim().toLowerCase();

  // IPv6 (includes v4-mapped like ::ffff:127.0.0.1)
  if (ip.includes(":")) {
    const unbracketed = ip.replace(/^\[|\]$/g, "");
    if (unbracketed === "::" || unbracketed === "::1") return true;
    if (unbracketed.startsWith("fc") || unbracketed.startsWith("fd")) return true; // fc00::/7
    if (/^fe[89ab]/.test(unbracketed)) return true; // fe80::/10
    const v4Mapped = unbracketed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4Mapped) return isPrivateAddress(v4Mapped[1]);
    return false;
  }

  const octets = ip.split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) {
    // Not a valid IPv4 literal — treat as unknown host, caller resolves DNS.
    return false;
  }
  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true; // multicast + reserved
  return false;
}

/** True when the hostname is an IP literal (v4 or bracketed/plain v6). */
export function isIpLiteral(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "");
  return /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":");
}

/** Hostnames that must be rejected without DNS resolution. */
export function isForbiddenHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (isIpLiteral(h)) return isPrivateAddress(h);
  return false;
}

/** True when two URLs share an origin (scheme + host + port). */
export function isSameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

/**
 * Normalize a page URL for dedupe: lowercase host, drop hash, drop default
 * port, treat trailing-slash variants as equal (except root which keeps "/").
 */
export function normalizePageUrl(input: string): string {
  const url = new URL(input);
  url.hash = "";
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  return `${url.origin}${pathname}${url.search}`;
}
