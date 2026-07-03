# Vision — SiteOps QA

> Captured by the Product Planner skill. This file is the source of truth for
> generating product-vision.md, prd.md, and product-roadmap.md. Edit it directly
> and re-run the Product Planner to regenerate downstream documents.
>
> Source: This vision was derived from the founder's full PRD
> (https://docs.google.com/document/d/17GO7gJO7EYsoN1stjmEz3GQPILZ7ilk6PotpTcjXljA/)
> rather than a live intake conversation. Fields marked *(suggested)* were
> filled with sensible defaults where the PRD was silent — edit freely.

**Created:** 2026-07-02
**Updated:** 2026-07-02

## Founder

- **Name:** Logan Irish *(suggested — inferred from workspace; edit if wrong)*
- **Expertise:** Senior software engineer building with AI coding agents; WordPress site operations and agency workflows
- **Background:** Builds and maintains WordPress sites and has watched them degrade silently after plugin updates, theme changes, and PHP upgrades — forms break, layouts shift, CTAs vanish — while uptime monitors report everything as "fine." Wants to productize the repeatable post-change QA workflow agencies do manually (or skip entirely).

## Purpose

- **Who you help:** WordPress agencies, freelancers, and internal website managers who maintain 5–150+ client websites under monthly retainers
- **Problem you solve:** WordPress sites degrade quietly after updates, edits, launches, and PHP upgrades. QA is manual and inconsistent, clients often find issues before the agency does, and agencies can't prove the value of maintenance retainers.
- **Desired transformation:** From "we clicked around and hope nothing broke" to a repeatable, evidence-based workflow: update → scan → review → send a client-ready QA receipt that proves the site was checked.
- **Why you:** Lived the problem from the site-operations side; deep familiarity with WordPress failure patterns (plugins, page builders, forms, PHP) and with building AI-agent-driven products.

## Product

- **Name:** SiteOps QA
- **One-liner:** SiteOps QA generates automated, client-ready WordPress QA receipts (PatchProof reports) after every update, edit, and launch.
- **How it works:** A user adds a WordPress site by URL, selects important pages (discovered via sitemap or entered manually), and creates a baseline — desktop/mobile screenshots plus technical snapshot. After any change, they run a scan: the system re-captures everything, diffs it against the baseline, detects visual and technical issues, classifies severity, and an AI QA analyst drafts both an internal report and a plain-English client receipt the user reviews, edits, and shares via link.
- **Key capabilities:**
  - Baseline + post-change scanning with desktop/mobile visual diffing
  - Technical checks: HTTP status, console errors, broken links, missing images, metadata changes, form/CTA presence
  - Severity classification (critical/high/medium/low/info) with human-review escalation
  - AI-drafted internal QA summaries and client-friendly QA receipts, grounded in scan evidence
  - Shareable report links with human approval before anything reaches a client
- **Platform:** web
- **Market differentiation:** Uptime monitors confirm a site is online, not that it works. SEO crawlers and security scanners ignore post-change QA. SiteOps QA is WordPress-specific, agency-specific, report-first, and post-change focused — the wedge is "what changed or broke after we touched the site, and can we prove we checked?"
- **Magic moment:** An agency runs a scan right after a plugin update and, within minutes, sees a side-by-side before/after diff that catches a broken contact form — then sends the client a professional QA receipt proving the site was checked, before the client ever notices.

## Audience

- **Primary user:** WordPress agency owner or operations lead managing 10–150 maintenance clients, with little or no dedicated QA staff, who needs to protect client trust, margins, and recurring retainer revenue
- **Secondary users:**
  - Freelance WordPress developers managing 5–30 client sites who need lightweight, professional post-update QA
  - Internal website managers responsible for company WordPress sites edited by many stakeholders
- **Current alternatives:** Manual click-through checklists, uptime monitors (UptimeRobot, Pingdom), visual regression dev tools (Percy, BackstopJS), maintenance platforms (ManageWP, MainWP), SEO crawlers — or nothing at all
- **Frustrations:** Uptime tools confirm the site is online, not that forms work or layouts hold. Dev-oriented visual regression tools aren't client-facing or agency-workflow-friendly. Maintenance platforms bulk-update but don't verify or prove anything. Manual QA is inconsistent, doesn't scale, and produces no client-visible proof.

## Business

- **Revenue model:** subscription
- **90-day goal:** Launch a paid MVP; 3–5 paying pilot customers ($500 setup + $199/mo or $1,500 90-day pilots); ~$1,500 MRR within 3–6 months; validate that agencies pay for QA receipts
- **6-month vision:** Agencies embed SiteOps QA in monthly retainer workflows; scheduled scans and report history ship; on track toward $10,000 MRR at 12 months; expansion revenue by sites/pages/frequency
- **Constraints:** Solo founder building with AI coding agents; scan infrastructure (browser automation, screenshots) must stay cost-controlled via queues, plan limits, and storage optimization; MVP must ship in ~4–6 weeks *(suggested)*
- **Go-to-market:** Productized service first, SaaS second. Pilot offer to agencies ("automated post-update QA receipts for 5 of your maintenance clients"), teardown content ("what broke after this plugin update?"), WordPress agency communities, LinkedIn, cold email with setup fees ($500–$2,500) to qualify serious buyers

## Brand Voice

- **Personality:** A reliable junior QA analyst — calm, professional, evidence-based, honest about uncertainty. Never alarmist, never overconfident. Helps the agency look proactive and professional in front of clients.
- **Tone of voice:** Plain English for owners and account managers, technical detail available for developers. Example client-report line: "The site appears stable after the update. One minor spacing change was detected on the Services page and has been flagged for review." Example internal line: "Contact form no longer detected on /contact (was present in baseline). Likely related to today's plugin update — needs human review." Never invents issues, never claims fixes without evidence.

> Visual identity (mood, anti-patterns, design tokens) is deliberately not
> captured here — it lives in docs/design.md, generated by the Design System
> skill from image references.

## Tech Stack

- **App type:** web
- **Frontend:** Next.js (App Router) + Tailwind CSS — PRD-recommended; best AI coding agent support; deploys to Vercel
- **Backend:** Next.js API routes/server actions + a separate Node.js worker service for scans — scans need long-running Playwright browser sessions that don't fit serverless limits; worker runs on Railway
- **Database:** Supabase Postgres — PRD recommends Postgres; Supabase bundles database, auth, and storage in one service, minimizing integration surface for a solo founder
- **Auth:** Supabase Auth — PRD-recommended option; co-located with the database, supports orgs via app-level tables, generous free tier
- **Payments:** Stripe — PRD-specified; subscriptions with plan limits by sites/pages/scan frequency
- **Analytics:** PostHog — free tier covers early volume; instrument scans-run, reports-shared, and magic-moment funnel
- **Email:** Resend — transactional email for auth and (later) report notifications; clean Next.js fit
- **Error tracking:** Sentry — scan workers fail in messy ways against real-world WordPress sites; production error visibility from day one
- **Other core services:** Playwright for browser automation/screenshots; Inngest for scan queue/background jobs; Supabase Storage for screenshots; Anthropic Claude API for AI summaries; pixelmatch + sharp for visual diffing *(suggested — from PRD § 12.2 options)*

## Tooling

- **Coding agent:** Claude Code
