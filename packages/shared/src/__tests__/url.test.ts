import { describe, expect, it } from "vitest";
import {
  isForbiddenHostname,
  isPrivateAddress,
  isSameOrigin,
  normalizePageUrl,
  normalizeSiteUrl,
} from "../url";

describe("normalizeSiteUrl", () => {
  it("adds https:// when the scheme is missing", () => {
    expect(normalizeSiteUrl("example.com")).toBe("https://example.com");
  });

  it("strips path, query, and hash down to the origin", () => {
    expect(normalizeSiteUrl("https://example.com/blog/post?a=1#top")).toBe(
      "https://example.com"
    );
  });

  it("lowercases the host and trims whitespace", () => {
    expect(normalizeSiteUrl("  HTTPS://ExAmPle.COM/about  ")).toBe(
      "https://example.com"
    );
  });

  it("keeps explicit http", () => {
    expect(normalizeSiteUrl("http://example.com/x")).toBe("http://example.com");
  });

  it("rejects empty, malformed, and non-http inputs", () => {
    expect(() => normalizeSiteUrl("")).toThrow();
    expect(() => normalizeSiteUrl("not a url")).toThrow();
    expect(() => normalizeSiteUrl("ftp://example.com")).toThrow();
    expect(() => normalizeSiteUrl("javascript://example.com")).toThrow();
  });

  it("rejects bare hostnames without a dot", () => {
    expect(() => normalizeSiteUrl("intranet")).toThrow();
  });

  it("rejects non-standard ports", () => {
    expect(() => normalizeSiteUrl("https://example.com:8443")).toThrow();
    expect(() => normalizeSiteUrl("http://example.com:8080")).toThrow();
  });

  it("allows explicit default ports", () => {
    expect(normalizeSiteUrl("https://example.com:443")).toBe(
      "https://example.com"
    );
  });
});

describe("isPrivateAddress", () => {
  it.each([
    "10.0.0.1",
    "10.255.255.255",
    "172.16.0.1",
    "172.31.4.2",
    "192.168.1.1",
    "127.0.0.1",
    "127.9.9.9",
    "169.254.169.254",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:192.168.0.5",
  ])("flags %s as private/reserved", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "172.15.0.1",
    "172.32.0.1",
    "192.167.0.1",
    "2606:4700::1111",
    "::ffff:8.8.8.8",
  ])("allows public %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe("isForbiddenHostname", () => {
  it.each([
    "localhost",
    "LOCALHOST",
    "sub.localhost",
    "printer.local",
    "db.internal",
    "127.0.0.1",
    "10.1.2.3",
    "[::1]",
    "localhost.",
  ])("rejects %s without DNS", (host) => {
    expect(isForbiddenHostname(host)).toBe(true);
  });

  it("allows normal public hostnames and public IPs", () => {
    expect(isForbiddenHostname("example.com")).toBe(false);
    expect(isForbiddenHostname("8.8.8.8")).toBe(false);
  });
});

describe("isSameOrigin", () => {
  it("matches identical origins regardless of path", () => {
    expect(isSameOrigin("https://a.com/x", "https://a.com/y?z")).toBe(true);
  });

  it("rejects different scheme, host, or garbage", () => {
    expect(isSameOrigin("http://a.com", "https://a.com")).toBe(false);
    expect(isSameOrigin("https://a.com", "https://b.com")).toBe(false);
    expect(isSameOrigin("nope", "https://a.com")).toBe(false);
  });
});

describe("normalizePageUrl", () => {
  it("drops trailing slash and hash, keeps query", () => {
    expect(normalizePageUrl("https://a.com/about/#team")).toBe(
      "https://a.com/about"
    );
    expect(normalizePageUrl("https://a.com/p?x=1")).toBe("https://a.com/p?x=1");
  });

  it("keeps the root slash", () => {
    expect(normalizePageUrl("https://a.com/")).toBe("https://a.com/");
  });
});
