import { createHash } from "node:crypto";
import type { Page } from "playwright";

// ── Types ────────────────────────────────────────────────────────────────────

export type FormPlugin = "cf7" | "gravity" | "wpforms" | "ninja" | "hubspot" | "generic";

export interface FormDescriptor {
  selector: string;
  fieldCount: number;
  hasSubmit: boolean;
  plugin: FormPlugin;
}

export interface CtaDescriptor {
  selector: string;
  text: string;
  href: string | null;
}

export interface PageExtract {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonical: string | null;
  forms: FormDescriptor[];
  ctas: CtaDescriptor[];
  internalLinks: string[];
  missingImages: string[];
}

/** Raw payload returned by the single in-page evaluate. */
interface RawExtract {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonical: string | null;
  forms: {
    selector: string;
    fieldCount: number;
    hasSubmit: boolean;
    classNames: string;
    iframeSrc: string | null;
  }[];
  ctaCandidates: { selector: string; text: string; href: string | null; region: string }[];
  anchorHrefs: string[];
  missingImages: string[];
}

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────

/** Plugin guess from a form container's class list / embedded iframe (FR-007). */
export function guessFormPlugin(classNames: string, iframeSrc: string | null): FormPlugin {
  const classes = classNames.toLowerCase();
  if (classes.includes("wpcf7")) return "cf7";
  if (classes.includes("gform_wrapper")) return "gravity";
  if (classes.includes("wpforms-container")) return "wpforms";
  if (classes.includes("nf-form-cont")) return "ninja";
  if (classes.includes("hbspt-form")) return "hubspot";
  if (iframeSrc && iframeSrc.includes("hsforms")) return "hubspot";
  return "generic";
}

const CTA_PATTERN = /contact|quote|book|call|buy|get started|sign up|subscribe|download/i;

/** FR-006 CTA heuristic: text match in header/hero/footer, top 5. */
export function pickCtas(
  candidates: { selector: string; text: string; href: string | null; region: string }[]
): CtaDescriptor[] {
  const seen = new Set<string>();
  const picked: CtaDescriptor[] = [];
  for (const c of candidates) {
    const text = c.text.replace(/\s+/g, " ").trim();
    if (!text || text.length > 80 || !CTA_PATTERN.test(text)) continue;
    const key = `${text}|${c.href ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push({ selector: c.selector, text, href: c.href });
    if (picked.length === 5) break;
  }
  return picked;
}

/** Same-origin anchor hrefs, resolved + deduped (hash stripped). */
export function normalizeInternalLinks(hrefs: string[], pageUrl: string): string[] {
  const origin = new URL(pageUrl).origin;
  const out = new Set<string>();
  for (const href of hrefs) {
    let url: URL;
    try {
      url = new URL(href, pageUrl);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (url.origin !== origin) continue;
    url.hash = "";
    out.add(url.toString());
  }
  return [...out];
}

/**
 * Normalize HTML before hashing so dynamic noise doesn't change the hash:
 * strip <script>/<style> contents, nonce/csrf attribute values, and 10+ digit
 * numbers (timestamps).
 */
export function normalizeHtmlForHash(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "<script></script>")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "<style></style>")
    .replace(/\b([a-zA-Z0-9_-]*(?:nonce|csrf|token)[a-zA-Z0-9_-]*)=("[^"]*"|'[^']*')/gi, '$1=""')
    // hidden nonce/csrf inputs carry the secret in value="…" (e.g. _wpnonce)
    .replace(/<input\b[^>]*>/gi, (tag) =>
      /nonce|csrf|token/i.test(tag) ? tag.replace(/value=("[^"]*"|'[^']*')/gi, 'value=""') : tag
    )
    .replace(/\d{10,}/g, "0");
}

export function hashHtml(html: string): string {
  return createHash("sha256").update(normalizeHtmlForHash(html)).digest("hex");
}

// ── In-page extraction ───────────────────────────────────────────────────────

/**
 * One evaluate() collecting everything FR-006/007 needs; classification
 * (plugin guess, CTA filter, link normalization) happens Node-side so it is
 * unit-testable.
 */
export async function extractFromPage(page: Page): Promise<PageExtract> {
  // Serialized as a string: tsx/esbuild "keepNames" would otherwise wrap the
  // function in __name(...) helper calls that don't exist inside the page.
  const raw = (await page.evaluate(IN_PAGE_SCRIPT)) as RawExtract;

  return {
    title: raw.title,
    metaDescription: raw.metaDescription,
    h1: raw.h1,
    canonical: raw.canonical,
    forms: raw.forms.map((f) => ({
      selector: f.selector,
      fieldCount: f.fieldCount,
      hasSubmit: f.hasSubmit,
      plugin: guessFormPlugin(f.classNames, f.iframeSrc),
    })),
    ctas: pickCtas(raw.ctaCandidates),
    internalLinks: normalizeInternalLinks(raw.anchorHrefs, page.url()),
    missingImages: raw.missingImages,
  };
}

// Plain JS, evaluated as an expression in the page.
const IN_PAGE_SCRIPT = `(() => {
  const cssPath = (el) => {
    if (el.id) return "#" + el.id;
    const parts = [];
    let node = el;
    while (node && node !== document.body && parts.length < 4) {
      let part = node.tagName.toLowerCase();
      const cls = [...node.classList].slice(0, 2).join(".");
      if (cls) part += "." + cls;
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };

  const meta = (name) => {
    const el = document.querySelector('meta[name="' + name + '"]');
    return (el && el.content && el.content.trim()) || null;
  };

  // Forms: real <form> elements plus plugin containers that may lazy-render
  // their form (FR-007). Never touched, only described.
  const pluginContainerSelector =
    ".wpcf7, .gform_wrapper, .wpforms-container, .nf-form-cont, .hbspt-form, iframe[src*='hsforms']";
  const formEls = new Set();
  document.querySelectorAll("form").forEach((f) => formEls.add(f));
  document.querySelectorAll(pluginContainerSelector).forEach((c) => {
    const inner = c.querySelector("form");
    if (inner) formEls.delete(inner);
    formEls.add(c);
  });
  const forms = [...formEls].slice(0, 20).map((el) => {
    const fields = el.querySelectorAll("input:not([type=hidden]), textarea, select").length;
    const submit = el.querySelector(
      "input[type=submit], button[type=submit], button:not([type]), [role=button][class*=submit]"
    );
    const visibleSubmit =
      submit instanceof HTMLElement && submit.offsetWidth > 0 && submit.offsetHeight > 0;
    const container =
      el.tagName === "FORM" && el.parentElement && el.parentElement.closest(pluginContainerSelector)
        ? el.parentElement.closest(pluginContainerSelector)
        : el;
    const innerIframe = el.tagName === "IFRAME" ? el : el.querySelector("iframe");
    return {
      selector: cssPath(el),
      fieldCount: fields,
      hasSubmit: visibleSubmit,
      classNames: (String(el.className || "") + " " + String(container.className || "")).trim(),
      iframeSrc: innerIframe ? innerIframe.getAttribute("src") : null,
    };
  });

  // CTA candidates from header / hero (main) / footer.
  const regions = [
    ["header", document.querySelector("header")],
    ["hero", document.querySelector("main") || document.body],
    ["footer", document.querySelector("footer")],
  ];
  const ctaCandidates = [];
  for (const [region, root] of regions) {
    if (!root) continue;
    root.querySelectorAll("a, button").forEach((el) => {
      if (ctaCandidates.length >= 100) return;
      ctaCandidates.push({
        selector: cssPath(el),
        text: el.innerText || el.textContent || "",
        href: el.getAttribute("href"),
        region,
      });
    });
  }

  const anchorHrefs = [...document.querySelectorAll("a[href]")]
    .map((a) => a.getAttribute("href") || "")
    .filter(Boolean)
    .slice(0, 500);

  const missingImages = [...document.querySelectorAll("img[src]")]
    .filter((img) => img.complete && img.naturalWidth === 0)
    .map((img) => img.currentSrc || img.src)
    .slice(0, 20);

  const h1El = document.querySelector("h1");
  const canonicalEl = document.querySelector("link[rel=canonical]");
  return {
    title: (document.title && document.title.trim()) || null,
    metaDescription: meta("description"),
    h1: (h1El && h1El.textContent && h1El.textContent.replace(/\\s+/g, " ").trim()) || null,
    canonical: (canonicalEl && canonicalEl.getAttribute("href")) || null,
    forms,
    ctaCandidates,
    anchorHrefs,
    missingImages,
  };
})()`;
