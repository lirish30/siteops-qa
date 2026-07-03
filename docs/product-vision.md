# Product Vision — SiteOps QA

## 1. Vision & Mission

### Vision Statement
Every WordPress agency updates, launches, and maintains client websites with a repeatable, proof-based QA workflow — so sites never degrade silently and clients never find breakage first.

### Mission Statement
SiteOps QA automatically checks the pages that matter after every WordPress change and generates evidence-backed QA receipts agencies can send to clients.

### Founder's Why
The founder has lived the operations side of WordPress: plugin updates that quietly break contact forms, theme updates that shift layouts nobody notices for weeks, PHP upgrades that surface compatibility bugs on the one page a client's ad campaign points to. The site stays "up" the entire time, so uptime monitors report green while leads silently stop arriving.

Agencies know this pattern intimately, but their answer is manual: click through a few pages, test the homepage form, hope. That process doesn't scale, isn't consistent across team members, and — critically — produces nothing the agency can show a client to justify the monthly retainer. The founder is building the tool that turns "we hope nothing broke" into "here's proof we checked."

This is a workflow the founder can build credibly: deep familiarity with WordPress failure patterns (plugins, page builders, forms, PHP) combined with experience shipping AI-agent-driven products. The AI here is deliberately bounded — a junior QA analyst that gathers evidence and drafts reports, not an autonomous developer that pretends to fix things.

### Core Values
1. **Evidence before AI opinion.** Every AI summary is grounded in screenshots, diffs, status codes, and logs. If the scan didn't capture it, the product doesn't claim it. This is what makes the reports trustworthy enough to send to clients.
2. **Human approval before client communication.** The product drafts; the agency approves. No report reaches a client without a human clicking send. This keeps the agency in control of its client relationships.
3. **Plain English over technical noise.** Account managers get calm summaries; developers get console logs and diffs. Both audiences are served by the same scan without either drowning.
4. **Severity honesty.** A changed meta description is not a broken contact form. The product distinguishes harmless changes, review-worthy changes, and critical issues — and says "needs human review" when it isn't sure.
5. **Bounded automation.** Detect, summarize, recommend — never auto-fix, never auto-send, never overclaim. Trust is the product's core asset and overconfidence would destroy it.

### Strategic Pillars
1. **The report is the product.** The client-facing QA receipt is the wedge, the differentiator, and the sales asset. Every feature decision is judged by whether it makes the receipt more valuable.
2. **Post-change focus, not generic monitoring.** The trigger is always "we touched the site." That framing beats generic monitoring on relevance and beats manual QA on consistency.
3. **WordPress-specific beats generic.** Understanding wp-content paths, sitemap conventions, page builders, and common form plugins is the moat against generic visual-regression tools.
4. **Narrow wedge first, SiteOps platform later.** Nail post-update QA receipts before touching form submission testing, analytics QA, plugin risk scoring, or staging comparisons. The roadmap holds the vision; the MVP holds one job.

### Success Looks Like
Twelve months out: 40–60 agencies pay monthly, several on Agency Pro ($399) or Scale ($699), producing ~$10,000 MRR plus setup fees. Agencies run scans reflexively after every update batch and forward PatchProof receipts to clients as part of their monthly retainer deliverables. Churn is low because the receipts are embedded in the agencies' own client relationships. Pilot feedback has driven scheduled scans and portfolio dashboards, and agencies are asking for more sites — not more features — which is the signal to expand into form testing and risk scoring.

## 2. User Research

### Primary Persona
**Marcus, 41, owner of a 6-person WordPress agency.** He manages roughly 60 active maintenance clients on $99–$499/month retainers covering hosting, updates, edits, and support. Update days are his least favorite: someone on the team batches plugin updates across 20 sites, clicks through a few homepages, and moves on. Twice in the last quarter a client emailed first — once about a contact form that had been broken for eleven days. Marcus is technically capable but spends his time on sales and client relationships, not QA. He's tried uptime monitoring (useless for this — the sites were "up") and once evaluated a visual regression tool built for developers (too fiddly, nothing client-facing). What would make him switch: a tool his account managers can run without a developer, that catches the embarrassing stuff, and that produces a professional report he can attach to the monthly invoice. His emotional driver is not efficiency — it's never again getting the "your client found it first" email.

### Secondary Personas
**Dana, freelance WordPress developer, 22 client sites.** Works alone, does updates in evening batches, has no time to click through every page. Wants cheap, lightweight scanning and a professional-looking receipt that makes her one-person shop look like an agency. Price sensitive — the $59 Freelancer tier is built for her.

**Priya, internal website manager at a 200-person company.** Owns the company WordPress site but doesn't control it — marketing edits landing pages, contractors ship features, leadership expects it to "just work." She needs baselines before launches, scans after every stakeholder change, and a change history that protects her when something breaks that she didn't touch.

**Future: managed hosting / white-label maintenance providers** with hundreds of sites, needing risk-prioritized triage at scale. Not targeted at launch, but the architecture (orgs, sites, plan limits) shouldn't preclude them.

### Jobs To Be Done
- **Functional:** After a change to a WordPress site, verify that the important pages still look right and work — forms present, links live, no console errors, no layout breaks — without manually clicking through every page on every device.
- **Functional:** Produce a client-ready document proving maintenance QA occurred, in minutes, not an hour of screenshot-pasting.
- **Emotional:** Feel confident hitting "update all" and confident emailing the client afterward. Eliminate the low-grade dread of update days.
- **Social:** Look proactive and professional to clients — be the agency that catches problems before anyone else, and that shows its work.

### Pain Points
1. **Clients find breakage first** (severe, monthly for most agencies). Directly damages trust and retention; the current "fix" is apologizing fast. This is the pain the product leads with.
2. **QA is inconsistent and unscalable** (severe, every update cycle). Different team members check different things; nothing is documented. Currently handled by informal checklists that decay.
3. **Retainer value is invisible** (moderate but chronic). Clients ask "what am I paying for?" because maintenance work leaves no artifact. Agencies currently write manual monthly summaries or send nothing.
4. **Manual QA erodes margins** (moderate, continuous). Clicking through pages is unbilled repetitive labor; the alternative — skipping QA — feeds pain #1.
5. **Silent degradation between checks** (real but less acute at MVP — scheduled scans address it in Phase 2 of the product roadmap).

### Current Alternatives & Competitive Landscape
- **Manual click-through / checklists:** Free and flexible; inconsistent, unscalable, no proof artifact. Switching requires only trust that the tool checks what they'd check.
- **Uptime monitors (UptimeRobot, Pingdom):** Excellent at "is it up," blind to "does it work." Agencies already know this gap — the sales message names it.
- **Visual regression dev tools (Percy, BackstopJS, Chromatic):** Strong diffing tech, but built for CI pipelines and developers; no WordPress awareness, no severity classification, nothing client-facing. Switching cost is high for non-developer staff.
- **WordPress maintenance platforms (ManageWP, MainWP, WP Umbrella):** Handle bulk updates and basic client reports, and some offer before/after screenshots — the nearest competitive threat. They verify that updates *ran*, not that the site still *works*; QA depth, severity classification, and evidence-based receipts are the gap SiteOps QA occupies.
- **Do nothing:** The true incumbent. Beaten by pilot offers with setup fees, teardown marketing, and reports impressive enough that skipping them feels like malpractice.

### Key Assumptions to Validate
1. We assume agencies will *pay* for QA receipts, not just like them. Validate: 3–5 paid pilots with setup fees before building past MVP.
2. We assume the client-facing receipt (not the dashboard) drives purchase. Validate: track whether pilots actually share report links with clients.
3. We assume visual diff noise can be tamed enough to be useful (dynamic content, sliders, ads). Validate: run the 50-example eval set against real sites; measure false-positive rate; ship ignored-regions early if needed.
4. We assume form *presence* detection (without submission testing) is valuable enough for v1. Validate: pilot feedback on whether "form still detected" carries weight in reports.
5. We assume account managers — not just developers — will run scans. Validate: watch pilot usage by role.
6. We assume scan infrastructure costs stay within plan margins. Validate: measure per-scan compute/storage cost during pilots against plan pricing.
7. We assume AI summaries grounded in scan data will be trusted after light editing. Validate: measure AI-summary edit rate; if users rewrite everything, the drafts aren't good enough.

### User Journey Map
**Awareness:** Marcus sees a teardown post — "What broke after this WordPress plugin update?" — in an agency community. It names his exact fear. **Consideration:** The pilot offer ("QA receipts for 5 of your maintenance clients, $500 setup") is concrete and cheap relative to one lost client; the setup fee signals seriousness rather than another freemium tool to abandon. **First use:** He adds a site, pages are auto-discovered from the sitemap, he picks eight important ones, and a baseline builds while he watches thumbnails appear. Friction risk here: if baseline creation is slow or flaky on his real (messy) sites, trust dies immediately. **Magic moment:** After his next plugin update batch, he runs a scan and the results screen shows a side-by-side diff — the pricing page CTA is gone. He fixes it, re-scans, and sends the client a receipt showing the site was checked and verified. Nobody outside the agency ever knew. **Habit formation:** Scans become the last step of every update session; the receipt becomes part of the monthly invoice email. **Advocacy:** Marcus posts his own before/after story in the same community where he found the product.

## 3. Product Strategy

### Product Principles
1. **Start with the workflow, not the dashboard.** The product ships the update → scan → review → report loop first; portfolio analytics come later.
2. **Sell the report, not the scan.** Scan quality is the engine, but the receipt is what the customer buys and shows off.
3. **Severity is the interface.** Every finding carries critical/high/medium/low/info or "needs human review" — the UI, the reports, and the escalation logic all key off it.
4. **Never overclaim.** Uncertainty language is a feature. "Likely related to today's plugin update" beats a confident wrong answer, in both the UI and AI copy.
5. **Conservative on real sites.** Real WordPress sites are messy — animations, popups, cookie banners, ad slots. Prefer missing a trivial diff over crying wolf; noise kills trust faster than false negatives at this stage.
6. **Bounded automation.** MVP detects, classifies, and drafts. It does not submit forms, fix sites, or email clients.

### Market Differentiation
SiteOps QA doesn't compete on breadth of checks — dedicated SEO crawlers, security scanners, and accessibility auditors will always go deeper in their lanes. It wins on the intersection nobody owns: **WordPress-specific + agency-specific + report-first + post-change-focused.** Generic visual regression tools understand pixels but not WordPress or clients. Maintenance platforms understand agencies but verify that updates ran, not that sites still work. Uptime monitors answer the wrong question entirely. The defensibility compounds over time through operational memory: baselines, scan history, per-site noise tuning, and issue patterns make the product smarter about *each customer's specific sites* — which a switching competitor starts without.

### Magic Moment Design
The magic moment: **a scan after a real update catches a real problem — and produces a client-ready receipt — before any human noticed.** For this to happen reliably in the MVP: (1) baseline creation must be smooth on messy real-world sites, because it's the prerequisite step users do before any payoff; (2) scans must complete in minutes with visible progress, because "run scan" is the moment of highest attention; (3) the results screen must lead with a clear pass/review/fail verdict and side-by-side visuals, not raw data; (4) report generation must be one click from results. The shortest path from signup to magic moment: add site → auto-discover pages → select → baseline → (user performs their update) → scan → results → receipt. Everything in that chain is P0; nothing outside it is.

### MVP Definition
Buildable in ~4–6 weeks with AI coding agents. In scope:

1. **Accounts, orgs, and Stripe billing with plan limits** — the pilot offer requires charging money; plan limits (sites/pages) are the pricing model's backbone. Done: a user can sign up, subscribe, and hit enforced limits.
2. **Add WordPress site + page discovery** — URL normalization, reachability check, WordPress detection (wp-content, wp-json, generator tags), sitemap-based page discovery plus manual URL entry, monitored-page selection. Done: a real agency site's pages are listed and selectable in under two minutes.
3. **Baseline creation** — per-page desktop/mobile screenshots, HTTP status, title/meta/H1/canonical, HTML hash, console errors, broken links, form/CTA presence detection. Done: baseline visible with thumbnails and a technical snapshot per page.
4. **On-demand scan with baseline comparison** — visual diff with noise filtering, all technical checks re-run and diffed, progress UI, scan history. Done: a scan on a changed site surfaces the change with before/after evidence.
5. **Severity classification + human-review escalation** — rule-based severity per issue type, escalation flags per PRD § 11.7. Done: a missing form is critical; a changed meta description is low.
6. **AI internal summary + client receipt drafting** — grounded in scan data, uncertainty-aware, editable. Done: drafts require light editing, not rewriting.
7. **Report builder + shareable link** — internal/client variants, editable sections, public share URL. Done: an agency sends a receipt link to a client.

### Explicitly Out of Scope
Deferred from MVP with reasoning (full list in PRD § 13): **form submission testing** (tempting because forms are the #1 fear, but plugin diversity makes it a tarpit — presence detection first, submission testing in product Phase 3); **scheduled scans** (the retainer-workflow feature, but manual scans validate willingness to pay first — product Phase 2); **plugin/PHP risk scoring, analytics QA, accessibility/SEO audits** (each is its own product phase; bundling them delays launch — the PRD's Risk 3); **white-label/custom domains, Slack, email alerts, API access, hosting/GitHub integrations, WooCommerce flows, auto-fixing** (expansion revenue and later-phase features, not wedge features). Reconsider each only after pilots prove the core wedge.

### Feature Priority (MoSCoW)
- **Must have:** Auth + orgs; add site + WordPress detection; sitemap page discovery + manual URLs; baselines (screenshots + technical snapshot); on-demand scans; desktop/mobile visual diff; HTTP/console/broken-link/metadata/form-presence checks; severity classification; AI internal + client report drafts; editable report builder; shareable report links; Stripe billing + plan limits; scan history.
- **Should have:** Ignored regions / diff sensitivity settings; mark-change-as-expected; re-baseline flow; basic dashboard ("which sites need attention"); PDF-ish print styling for reports.
- **Could have:** Basic report branding (logo); scan reminders; CTA detection beyond heuristics; tablet screenshots.
- **Won't have (this time):** Everything in Explicitly Out of Scope above.

### Core User Flows
1. **Onboard a site:** Sign up → create org → add site URL → system verifies reachability + WordPress markers → sitemap pages listed → user selects/labels monitored pages (plan-limited) → baseline runs with progress → baseline review screen. Success: baseline complete on a real site in under 10 minutes, mostly waiting.
2. **Post-update scan (the magic moment):** From site dashboard → "Run scan" (with optional note: "updated 6 plugins") → progress per page → results screen with verdict, severity counts, per-page before/after diffs and technical findings → user marks expected changes, reviews escalations. Success: real breakage surfaces with evidence; noise is minimal.
3. **Send the receipt:** From scan results → "Generate report" → choose client-facing → AI draft appears → user edits copy, hides technical detail, adds agency notes → generate share link → send to client. Success: report needs light editing only and looks professional enough to attach to an invoice.

### Success Metrics
- **Primary:** Paying pilot customers running scans after real updates. Good: 3 pilots by day 90. Great: 5 pilots and $1,500 MRR by month 4.
- **Secondary:** Reports shared with clients per active org per month (good: ≥2; great: ≥8 — signals retainer-workflow embedding); scans per site per month; trial→paid conversion (good: 10%; great: 25%).
- **Leading indicators:** Time from signup to first baseline (target <15 min); time from scan to shared report (target <10 min); AI summary edit rate (good: <50% of drafts heavily edited); visual diff false-positive rate on the 50-example eval set (good: <20%; great: <10%).

### Risks
1. **Visual diff noise** (high likelihood, high impact — the top product risk). Dynamic content makes diffs cry wolf; noisy tools get abandoned. Mitigation: conservative thresholds, ignored regions, mark-as-expected, structural+technical signals weighted alongside pixels, per-site tuning over time, and the 50-example eval set as a pre-launch gate.
2. **AI overconfidence** (medium likelihood, high impact). One confident wrong root-cause claim in a client report destroys trust. Mitigation: evidence-grounded prompts, mandatory uncertainty language, human approval gate, never claim fixes.
3. **MVP scope creep** (high likelihood, high impact). The PRD's own backlog is enormous. Mitigation: the roadmap's phase gates; nothing outside the wedge ships before pilot validation.
4. **"Nice-to-have" perception** (medium likelihood, high impact). Mitigation: sell fire-drill prevention and retainer proof, not features; lead marketing with teardowns and the receipt itself; setup fees qualify serious buyers.
5. **Scan infrastructure costs** (medium likelihood, medium impact). Browser automation and screenshot storage scale with usage. Mitigation: queue-based workers, plan-enforced limits, screenshot compression/retention policies, per-scan cost telemetry from day one.
6. **Messy real-world sites break scanning** (high likelihood, medium impact). Bot blockers, infinite scroll, popups, geo-content. Mitigation: graceful per-page failure (a failed page is a finding, not a crashed scan), clear "unsupported" labeling, human-review escalation.
7. **Solo-founder execution risk** (medium likelihood, high impact). Mitigation: AI-agent build workflow with per-phase review gates; ruthless MVP scope; productized-service GTM that doesn't require product-led growth infrastructure.

## 4. Brand Strategy

### Positioning Statement
For WordPress agencies that manage client websites, SiteOps QA is an automated QA and site-operations platform that detects visual, technical, form, and WordPress-specific issues after updates, edits, and launches. Unlike generic uptime monitors or manual checklists, SiteOps QA creates baselines, runs repeatable scans, classifies severity, and generates internal and client-friendly reports agencies use to prove the value of ongoing maintenance.

### Brand Personality
SiteOps QA is the meticulous, unflappable QA analyst every agency wishes it could afford: the colleague who checks everything, documents everything, never panics, and never bluffs. In conversation they say "here's what I checked, here's what changed, here's what I'm not sure about" — never "everything's fine, trust me." They'd wear a clean button-down, not a hoodie with a mascot. They would never use a red siren emoji, never exaggerate a minor spacing shift into a crisis, and never claim credit for a fix they didn't verify. Clients find them reassuring; developers find them precise.

### Voice & Tone Guide
Voice: calm, precise, evidence-based, plainspoken. Tone shifts by context:

| Context | DO | DON'T |
|---|---|---|
| Onboarding | "Add your first site and we'll find its pages for you — you pick the ones that matter." | "Supercharge your QA workflow with AI-powered magic! 🚀" |
| Scan progress | "Checking 8 pages — capturing desktop and mobile screenshots now." | "Hang tight while our robots do their thing!" |
| Critical finding | "The contact form on /contact is no longer detected. It was present in the last baseline. This needs review before you notify your client." | "🚨 EMERGENCY: Your form is GONE!" |
| Uncertain finding | "The Services page layout shifted below the fold. This may be an intentional edit — mark it expected if so." | "Layout broken on Services page." (when unsure) |
| Empty state | "No scans yet. Run one after your next update and we'll compare it to your baseline." | "It's lonely in here!" |
| Success message | "Scan complete: 8 pages checked, no critical issues. One minor change flagged for review." | "Perfect score! Your site is flawless!" |
| Client report copy | "We completed a post-update QA scan and checked your most important pages for layout, form, link, and technical issues." | "Our AI detected zero anomalies in your DOM structure." |

### Messaging Framework
- **Tagline:** Automated WordPress QA receipts after every update.
- **Homepage headline:** Catch WordPress issues before your clients do — and prove you checked.
- **Value propositions:** (1) Repeatable post-update QA in minutes, not an hour of clicking. (2) Client-ready QA receipts that justify your maintenance retainer. (3) WordPress-specific detection — forms, layouts, links, errors — not just "the site is up."
- **Feature descriptions** follow the pattern *plain outcome, then mechanism*: "Know if a form disappeared — we compare every scan to your baseline."
- **Objection handlers:** *"We already do QA manually"* → "So does every agency whose client found the broken form first. This makes it consistent — and gives you the receipt." *"We have uptime monitoring"* → "Uptime says the site is online. It can't tell you the contact form is broken." *"Another subscription?"* → "One prevented fire drill pays for a year. And the receipt helps you keep the retainers that pay for everything."

### Elevator Pitches
- **5-second:** SiteOps QA generates automated QA receipts after every WordPress update, so agencies catch breakage before clients do.
- **30-second:** WordPress sites break quietly after updates — forms die, layouts shift, CTAs vanish — while the site stays "online." SiteOps QA snapshots your important pages, re-scans after every update, diffs everything visually and technically, and drafts a client-ready QA receipt. Agencies catch problems first and finally have proof their maintenance retainer is worth it.
- **2-minute:** Every WordPress agency has the same story: a plugin update broke a contact form, nobody noticed, and the client found it first. Uptime monitors can't catch this — the site was "up" the whole time. QA stays manual because generic visual-regression tools are built for developers and CI pipelines, not agencies and clients. SiteOps QA is post-change QA built for the agency workflow: baseline the pages that matter, scan after every update, get visual diffs and technical checks classified by severity, and send the client a plain-English QA receipt — drafted by AI from scan evidence, approved by a human. The wedge is the receipt: it turns invisible maintenance work into a monthly proof-of-value artifact, which is why agencies pay $59–$699/month and why they don't churn. From there the roadmap expands into form testing, plugin risk scoring, and launch QA — a full site-operations layer for WordPress agencies. We're onboarding pilot agencies now: $500 setup, $199/month for 25 sites.

### Competitive Differentiation Narrative
The tools agencies use today each answer the wrong question. Uptime monitors answer "is it online?" — but broken forms don't take sites offline. Maintenance platforms answer "did the updates run?" — but a successful update is precisely what breaks layouts. Developer visual-regression tools answer "did pixels change in CI?" — but agencies don't live in CI, and their clients certainly don't. SiteOps QA answers the question agencies actually get fired over: **"we changed the site — did anything important break, and can we prove we checked?"** It's WordPress-native, severity-aware, and report-first, with AI that drafts from evidence rather than opining from vibes. And because every scan enriches per-site baselines, history, and noise tuning, the product gets harder to switch away from with every update cycle it covers.

## 5. Visual Design

Visual design tokens (colors, typography, spacing, components, motion) live in `docs/design.md`, with a live-rendered style guide at `docs/design.html` (generated 2026-07-02).
