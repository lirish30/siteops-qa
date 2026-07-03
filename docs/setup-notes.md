# Setup Notes — founder manual steps

Steps the coding agent cannot do for you (dashboard work, credentials). Work top to bottom; each unblocks a piece of the app.

## 1. Supabase project (blocks: auth, database, everything)
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → New project → name it `siteops-qa`.
2. From Project Settings → API, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Put them in `apps/web/.env.local` (copy from `.env.example`).
4. Link the CLI and push migrations:
   ```sh
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
5. Auth settings (Dashboard → Authentication → URL Configuration):
   - Site URL: your app URL (`http://localhost:3000` for now)
   - Redirect URLs: add `http://localhost:3000/auth/callback`
6. SMTP via Resend (Dashboard → Project Settings → Auth → SMTP): host `smtp.resend.com`, user `resend`, password = your Resend API key, sender = an address on your verified domain. Until this is done, Supabase's built-in email works but is rate-limited (fine for dev).

## 2. Inngest (blocks: worker jobs)
1. Create an account at [inngest.com](https://www.inngest.com) → create app `siteops-qa`.
2. Copy the Event Key → `INNGEST_EVENT_KEY` and Signing Key → `INNGEST_SIGNING_KEY` (web env and worker env).
3. Local dev doesn't need keys: run `npx inngest-cli@latest dev` alongside the worker.

## 3. Sentry (blocks: error tracking only)
1. Create two projects at [sentry.io](https://sentry.io): `siteops-web` (Next.js) and `siteops-worker` (Node).
2. Copy each DSN into the matching env (`SENTRY_DSN`).

## 4. Deploy (Phase 0, TASK-013)
- **Vercel:** import the repo, set Root Directory to `apps/web`, add all web env vars from `.env.example`.
- **Railway:** new service from repo, build from `apps/worker/Dockerfile`, add worker env vars, 2 GB RAM minimum.
- **Inngest Cloud:** after the Railway deploy, register the worker URL (`https://<railway-app>/api/inngest`) under Apps → Sync new app.

## Env var checklist
See `.env.example` at the repo root for the full list with placeholders.
