import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // PRD § 2 Security: scrub cookies/headers everywhere; never capture
    // request bodies on webhook or auth routes.
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
      const url = event.request.url ?? "";
      if (url.includes("/api/webhooks/") || url.includes("/auth")) {
        delete event.request.data;
      }
    }
    return event;
  },
});
