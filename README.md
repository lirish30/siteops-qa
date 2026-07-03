# SiteOps QA

WordPress QA receipts for agencies: baseline → scan → diff → client-ready report.

## Layout

- `apps/web` — Next.js app (Vercel)
- `apps/worker` — Node + Inngest + Playwright scan worker (Railway)
- `packages/shared` — types, zod schemas, severity rules, plan limits
- `supabase/migrations` — SQL migrations
- `docs/` — product docs; `docs/product-roadmap.md` is the build source of truth

## Local development

```sh
npm install
npx supabase start          # local Postgres/auth/storage (Docker required)
npm run dev                 # web on :3000
npm run dev:worker          # worker on :3010
npx inngest-cli@latest dev -u http://localhost:3010/api/inngest   # Inngest dev server on :8288
```

Copy `.env.example` values into `apps/web/.env.local` and `apps/worker/.env`.
For the local Supabase stack, `npx supabase status` prints the URL and keys.

Cloud/service setup steps live in `docs/setup-notes.md`.

## Checks

```sh
npm run typecheck
npm run lint
npx vitest run
```
