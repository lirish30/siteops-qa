# Playwright base image: Chromium deps baked in (Playwright itself is used
# from Phase 2, but the image is fixed now so deploys don't change shape).
FROM mcr.microsoft.com/playwright:v1.57.0-noble

WORKDIR /app

# Monorepo install: worker + shared workspace only.
COPY package.json package-lock.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace apps/worker --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/worker apps/worker

RUN npx playwright install chromium

ENV NODE_ENV=production
EXPOSE 3010
CMD ["npm", "run", "start", "-w", "apps/worker"]
