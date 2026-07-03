import { describe, expect, it } from "vitest";
import {
  guessFormPlugin,
  hashHtml,
  normalizeHtmlForHash,
  normalizeInternalLinks,
  pickCtas,
} from "../extract";

describe("guessFormPlugin", () => {
  it("detects each supported plugin from container classes", () => {
    expect(guessFormPlugin("wpcf7 wpcf7-form", null)).toBe("cf7");
    expect(guessFormPlugin("gform_wrapper gravity-theme", null)).toBe("gravity");
    expect(guessFormPlugin("wpforms-container wpforms-container-full", null)).toBe("wpforms");
    expect(guessFormPlugin("nf-form-cont", null)).toBe("ninja");
    expect(guessFormPlugin("hbspt-form", null)).toBe("hubspot");
  });

  it("detects HubSpot via iframe src", () => {
    expect(guessFormPlugin("", "https://forms.hsforms.com/embed/123")).toBe("hubspot");
  });

  it("falls back to generic", () => {
    expect(guessFormPlugin("searchform", null)).toBe("generic");
    expect(guessFormPlugin("", null)).toBe("generic");
  });
});

describe("pickCtas", () => {
  const c = (text: string, href: string | null = "/x", region = "header") => ({
    selector: "a",
    text,
    href,
    region,
  });

  it("keeps only CTA-looking text, capped at 5", () => {
    const picked = pickCtas([
      c("Contact us"),
      c("About the team"), // no match
      c("Get a Quote"),
      c("Book Now"),
      c("Call today"),
      c("Buy tickets"),
      c("Sign up free"), // 6th match → dropped
    ]);
    expect(picked.map((p) => p.text)).toEqual([
      "Contact us",
      "Get a Quote",
      "Book Now",
      "Call today",
      "Buy tickets",
    ]);
  });

  it("dedupes by text+href and collapses whitespace", () => {
    const picked = pickCtas([c("Contact\n  us"), c("Contact us")]);
    expect(picked).toHaveLength(1);
    expect(picked[0].text).toBe("Contact us");
  });

  it("drops empty and over-long text", () => {
    expect(pickCtas([c(""), c("contact ".repeat(20))])).toHaveLength(0);
  });
});

describe("normalizeInternalLinks", () => {
  it("resolves relative links, keeps same-origin only, strips hashes, dedupes", () => {
    const links = normalizeInternalLinks(
      ["/about", "/about#team", "https://example.com/contact", "https://other.com/x", "mailto:a@b.c", "javascript:void(0)"],
      "https://example.com/page"
    );
    expect(links).toEqual(["https://example.com/about", "https://example.com/contact"]);
  });

  it("ignores unparseable hrefs", () => {
    expect(normalizeInternalLinks(["http://"], "https://example.com")).toEqual([]);
  });
});

describe("normalizeHtmlForHash / hashHtml", () => {
  it("is stable across script/style content, nonces, csrf tokens, and timestamps", () => {
    const a = `<html><script nonce="abc">let t=1719890000000;</script><style>.x{color:red}</style><input type="hidden" name="_wpnonce" value="a8f3bc"><p data-nonce="q1">Hi 1719890000123</p></html>`;
    const b = `<html><script nonce="def">let t=1719899999999;</script><style>.y{color:blue}</style><input type="hidden" name="_wpnonce" value="ff01de"><p data-nonce="q2">Hi 1719899999888</p></html>`;
    expect(hashHtml(a)).toBe(hashHtml(b));
  });

  it("changes when real content changes", () => {
    expect(hashHtml("<p>Hello</p>")).not.toBe(hashHtml("<p>Goodbye</p>"));
  });

  it("empties script and style bodies but keeps surrounding markup", () => {
    const out = normalizeHtmlForHash("<div><script>secret()</script><style>.a{}</style><b>keep</b></div>");
    expect(out).toBe("<div><script></script><style></style><b>keep</b></div>");
  });
});
