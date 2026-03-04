import { createManifestHandler } from "@saleor/app-sdk/handlers/next";
import { type AppManifest } from "@saleor/app-sdk/types";
import { wrapWithLoggerContext } from "@saleor/apps-logger/node";
import { withSpanAttributes } from "@saleor/apps-otel/src/with-span-attributes";

import packageJson from "../../../package.json";
import { env } from "../../env";
import { loggerContext } from "../../logger-context";

const handler = createManifestHandler({
  async manifestFactory({ appBaseUrl }) {
    const iframeBaseUrl = env.APP_IFRAME_BASE_URL ?? appBaseUrl;
    const apiBaseURL = env.APP_API_BASE_URL ?? appBaseUrl;

    const manifest: AppManifest = {
      about: "Wishlist app for saving customer product preferences.",
      appUrl: iframeBaseUrl,
      author: "Saleor Commerce",
      dataPrivacyUrl: "https://saleor.io/legal/privacy/",
      homepageUrl: "https://github.com/saleor/apps",
      id: env.MANIFEST_APP_ID,
      name: "Wishlist",
      permissions: ["MANAGE_USERS", "MANAGE_PRODUCTS"],
      requiredSaleorVersion: ">=3.21 <4",
      supportUrl: "https://github.com/saleor/apps/discussions",
      tokenTargetUrl: `${apiBaseURL}/api/register`,
      version: packageJson.version,
      webhooks: [],
      brand: {
        logo: {
          default: `${apiBaseURL}/logo.png`,
        },
      },
    };

    return manifest;
  },
});

export default wrapWithLoggerContext(withSpanAttributes(handler), loggerContext);
