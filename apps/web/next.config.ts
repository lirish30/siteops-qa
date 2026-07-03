import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["@siteops/shared"],
};

export default withSentryConfig(nextConfig, {
  silent: true,
  // Source-map upload activates only when SENTRY_AUTH_TOKEN is set in CI/deploy.
  disableLogger: true,
});
