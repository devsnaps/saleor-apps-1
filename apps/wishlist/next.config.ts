import { withSentryConfig } from "@sentry/nextjs";
import { type NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@saleor/apps-shared", "@saleor/apps-logger", "@saleor/apps-otel"],
  experimental: {
    optimizePackageImports: ["@sentry/nextjs", "@sentry/node", "@saleor/app-sdk"],
  },
  bundlePagesRouterDependencies: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [{ module: /require-in-the-middle/ }];
    }

    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  disableLogger: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
