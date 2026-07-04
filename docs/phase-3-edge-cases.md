# Phase 3 Edge-Case Pass

Date: 2026-07-03

Scope: PRD § 11 Baseline & Scans table for Phase 3 scan/diff/result behavior.

| Scenario | Verification | Result |
|---|---|---|
| Page times out during capture | `scan.run` retries each page capture up to 3 attempts, then inserts a failed `page_scan_results` row plus a `scan_page_failed` issue. | Covered in code review; live timeout still needs Inngest test run. |
| Page newly returns 404/500 during scan | Eval cases `page-404` and `page-500` exercise 2xx-to-error transitions and classify `page_404` / `page_5xx` as critical. | Passed primary severity expectation; eval also records an extra console error from Chromium for the failed document load. |
| All pages fail | `scan.run` finalizer sets scan status `failed` when failed count equals page count and sends a Sentry message. | Covered in code review; live all-fail simulation still needs worker run. |
| Screenshots differ in height | Visual diff pads unequal heights; `heightDeltaPct` is stored in `metadata_snapshot` and included in visual issue evidence/description when >20%. | Covered by visual diff tests and code review. |
| Scan triggered while another runs | `POST /api/sites/:id/scans` returns 409 when a queued/running scan exists for the site. | Covered in API code review. |
| Baseline missing when scan requested | `POST /api/sites/:id/scans` returns 412 when no current complete baseline exists. | Covered in API code review and Run Scan modal handling. |
| Worker crash mid-scan | `scanWatchdog` sleeps 30 minutes, then force-fails scans still queued/running. | Covered in code review; real crash/resume still needs Inngest dev/cloud run. |

Automated checks run:

- `npm test -- --run` — 152 tests passed.
- `npm run typecheck -w apps/web` — passed.
- `npm run typecheck -w apps/worker` — passed.
- `npm run lint -w apps/web` — passed.
- `npm exec --workspace apps/worker tsx scripts/eval/run-eval.ts` — 8/10 passed; details in `docs/eval-results.md`.

Remaining live verification for the PR:

- Run a real baseline and scan against a mutable test WordPress site through Inngest.
- Simulate a timeout/all-pages-fail case in the worker runtime.
- Confirm Supabase Storage signed URLs render for scan result detail in the browser.
