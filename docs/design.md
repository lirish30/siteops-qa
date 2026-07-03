---
version: alpha
name: SiteOps QA
description: Calm, evidence-based design system for a WordPress QA and reporting SaaS — fintech-clean surfaces, one working blue, and a strictly reserved severity ramp.

colors:
  primary: "#2B47F0"
  primary-hover: "#1E35C7"
  primary-subtle: "#EBEEFE"
  on-primary: "#FFFFFF"
  background: "#F5F6FA"
  surface: "#FFFFFF"
  surface-sunken: "#EFF1F7"
  on-surface: "#16181D"
  on-surface-secondary: "#6C7280"
  on-surface-muted: "#9AA0AE"
  border: "#E5E8F0"
  border-strong: "#CDD2E0"
  focus-ring: "#93A5F8"
  severity-critical: "#DC2626"
  severity-critical-subtle: "#FDECEC"
  severity-high: "#EA580C"
  severity-high-subtle: "#FDF0E7"
  severity-medium: "#B45309"
  severity-medium-subtle: "#FBF3E4"
  severity-low: "#64748B"
  severity-low-subtle: "#EEF1F5"
  severity-info: "#0E7490"
  severity-info-subtle: "#E6F4F8"
  severity-pass: "#15803D"
  severity-pass-subtle: "#E9F6EE"
  on-severity: "#FFFFFF"

typography:
  display:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.01em
  h2:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  body-strong:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.55
  caption:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.01em
  stat:
    fontFamily: Inter, system-ui, sans-serif
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  mono:
    fontFamily: "JetBrains Mono", ui-monospace, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5

rounded:
  sm: 6px
  md: 10px
  lg: 16px
  full: 999px

spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 24px
  6: 32px
  7: 48px
  8: 64px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: 10px 18px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: 10px 18px
    height: 40px
  button-primary-disabled:
    backgroundColor: "{colors.border}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: 10px 18px
    height: 40px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: 10px 18px
    height: 40px
  button-secondary-hover:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: 10px 18px
    height: 40px
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 10px 14px
    height: 40px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.5}"
  card-feature:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.5}"
  badge-severity-critical:
    backgroundColor: "{colors.severity-critical-subtle}"
    textColor: "{colors.severity-critical}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 3px 10px
  badge-severity-high:
    backgroundColor: "{colors.severity-high-subtle}"
    textColor: "{colors.severity-high}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 3px 10px
  badge-severity-medium:
    backgroundColor: "{colors.severity-medium-subtle}"
    textColor: "{colors.severity-medium}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 3px 10px
  badge-severity-low:
    backgroundColor: "{colors.severity-low-subtle}"
    textColor: "{colors.severity-low}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 3px 10px
  badge-severity-info:
    backgroundColor: "{colors.severity-info-subtle}"
    textColor: "{colors.severity-info}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 3px 10px
  badge-severity-pass:
    backgroundColor: "{colors.severity-pass-subtle}"
    textColor: "{colors.severity-pass}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 3px 10px
  banner-verdict-pass:
    backgroundColor: "{colors.severity-pass-subtle}"
    textColor: "{colors.severity-pass}"
    typography: "{typography.h3}"
    rounded: "{rounded.lg}"
    padding: "{spacing.4}"
  banner-verdict-review:
    backgroundColor: "{colors.severity-medium-subtle}"
    textColor: "{colors.severity-medium}"
    typography: "{typography.h3}"
    rounded: "{rounded.lg}"
    padding: "{spacing.4}"
  banner-verdict-fail:
    backgroundColor: "{colors.severity-critical-subtle}"
    textColor: "{colors.severity-critical}"
    typography: "{typography.h3}"
    rounded: "{rounded.lg}"
    padding: "{spacing.4}"
  nav-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-secondary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  nav-item-active:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  chip:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.on-surface-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: 4px 12px
  report-document:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"
---

# SiteOps QA Design System

## Overview
SiteOps QA is an evidence-based WordPress QA platform for agencies, and the interface must feel the way its reports read: calm, professional, and trustworthy. The visual anchor is a fintech-grade dashboard aesthetic (from the NeoPay reference) — near-white canvas, white cards, one confident working blue — tempered by billow.so's "facts, not guesswork" minimalism. Users are agency owners and account managers checking scan results daily, often under mild stress ("did the update break anything?"), so the UI's job is de-escalation through clarity. Two anti-patterns define the boundary: never alarmist (no sirens, no pulsing reds, no drama around findings) and never dashboard-cluttered (no decorative charts or stat wallpaper — every element answers a question an agency actually has).

## Colors
`primary` (#2B47F0) is the single brand and interactive color — buttons, active nav, links, chart strokes, and the occasional feature card (`card-feature`) that mirrors the reference's blue hero panels. Everything else stays neutral: `background` for the page, `surface` for cards, `surface-sunken` for wells and inset areas, and a three-step text ramp (`on-surface` → `on-surface-secondary` → `on-surface-muted`). The severity ramp is functionally reserved: critical red, high orange, medium amber, low slate, info teal, pass green — each with a `-subtle` tint for badge and banner fills. Severity hues never appear decoratively; if a user sees red, something is genuinely critical. Info is teal rather than blue precisely so severity never collides with brand. All solid-on-white text pairings meet WCAG AA (the subtle-fill badges pair darkened text on pale tints for the same reason), and severity is always communicated with an icon or label alongside color, never color alone.

## Typography
Inter everywhere — a neutral geometric sans that reads like the reference screenshot and disappears behind the content, with JetBrains Mono (`mono`) reserved for evidence: URLs, console errors, HTTP statuses, and diff values. The scale is numbers-first, borrowed from fintech: `stat` (28/700, tight tracking) makes severity counts and scan totals the loudest thing on a screen, while `caption` (12/500) keeps labels quiet above them. `display` is for marketing and empty-state moments only; app screens top out at `h1`. Body text stays at 14px — this is a dense professional tool, not a reading app. Never introduce a serif or a display novelty face; tone comes from restraint, not typography tricks.

## Layout
An 8px rhythm with a 4px half-step, expressed in the `spacing` scale (4→64). Density is comfortable-professional: generous outside, compact inside — cards get `spacing.5` (24px) padding and sit in a 24px-gutter grid on the `background` canvas, while rows inside a card (transactions, issues, pages) pack at 12px vertical rhythm with hairline dividers. App chrome follows the reference: fixed left sidebar (~240px) on `surface`, content area on `background`, max content width ~1280px. The public report page is the exception: a single centered column (~720px) with `spacing.6` padding, styled like a document rather than a dashboard.

## Elevation & Depth
Essentially flat, like the reference: depth comes from background contrast (`background` vs `surface` vs `surface-sunken`) and 1px `border` hairlines, not shadows. Cards carry a whisper shadow (`0 1px 2px rgba(22,24,29,0.05)`) that reads as separation, not floating. Only true overlays — modals, popovers, toasts — earn a real shadow (`0 8px 30px rgba(22,24,29,0.12)`). Never stack shadows to signal importance; importance is signaled by severity tokens and hierarchy, not elevation.

## Shapes
Rounded but composed: `lg` (16px) for cards, banners, and the report document; `md` (10px) for buttons, inputs, and nav items; `sm` (6px) for small inline elements like thumbnails and code blocks; `full` for badges, chips, and avatars. The mix matches the reference — soft enough to feel modern and approachable, never so round it turns playful. Screenshots and diff images always sit in `sm`-rounded frames with a 1px `border` so evidence imagery reads as contained artifacts, not floating decoration.

## Components
Buttons: `button-primary` is the one blue action per view (Run scan, Generate report, Share); `button-secondary` is a bordered white button (1px `border-strong`) for everything else; disabled states go `border`-gray, never translucent-blue. Focus uses a 2px `focus-ring` outline on every interactive element. `input-text` is white with a 1px `border`, swapping to `focus-ring` on focus and `severity-critical` with a caption-size message on error. `card` is the default container; `card-feature` (blue fill, white text) is limited to one per screen for hero/summary moments, per the reference. The `badge-severity-*` family is the system's signature component — subtle-tinted pills with icon + label ("● Critical") — and `banner-verdict-*` scales the same semantics up for scan-result verdicts (pass / needs review / issues found). `nav-item-active` uses `primary-subtle` fill with `primary` text rather than a solid blue block, keeping the sidebar quiet. `report-document` styles the client-facing receipt: document-like, print-friendly, generous line-height, no app chrome — it must look credible attached to an invoice.

## Do's and Don'ts
**Do:** Keep one primary button per view — the workflow's next step should be unambiguous. **Do:** Pair every severity color with its icon and label; color is reinforcement, never the only channel. **Do:** Use `mono` for all technical evidence (URLs, errors, statuses) so scanning eyes can separate evidence from narrative. **Do:** Lead result screens with the verdict banner and `stat` numbers, details below — answer "am I okay?" first. **Do:** Keep the public report page document-plain; it represents the agency, not SiteOps QA. **Don't:** Use severity colors decoratively (no red delete buttons — use a bordered secondary with confirm). **Don't:** Introduce new hues, gradients, or dark-mode improvisations; the palette is closed until deliberately extended. **Don't:** Animate attention (pulse, shake, bounce) — findings persuade with evidence, not motion. **Don't:** Fill idle space with decorative charts or stats; if it doesn't answer an agency question, it's clutter. **Don't:** Put more than one `card-feature` blue panel on a screen; blue saturation is what keeps the calm.
