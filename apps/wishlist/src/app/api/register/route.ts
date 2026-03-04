import { createAppRegisterHandler } from "@saleor/app-sdk/handlers/next-app-router";
import { withSpanAttributesAppRouter } from "@saleor/apps-otel/src/with-span-attributes";
import { compose } from "@saleor/apps-shared/compose";

import { saleorApp } from "../../../../saleor-app";
import { env } from "../../../env";
import { createLogger } from "../../../logger";
import { withLoggerContext } from "../../../logger-context";

const logger = createLogger("createAppRegisterHandler");
const allowedUrlsPattern = env.ALLOWED_DOMAIN_PATTERN;

const handler = createAppRegisterHandler({
  apl: saleorApp.apl,
  allowedSaleorUrls: [
    (url) => {
      if (allowedUrlsPattern) {
        const regex = new RegExp(allowedUrlsPattern);
        const checkResult = regex.test(url);

        if (!checkResult) {
          logger.warn("Blocked installation attempt from disallowed Saleor instance", {
            saleorApiUrl: url,
          });
        }

        return checkResult;
      }

      return true;
    },
  ],
  onAplSetFailed: async (_req, context) => {
    logger.error("Failed to set APL", {
      saleorApiUrl: context.authData.saleorApiUrl,
      error: context.error,
    });
  },
  onAuthAplSaved: async (_req, context) => {
    logger.info("App configuration set up successfully", {
      saleorApiUrl: context.authData.saleorApiUrl,
    });
  },
});

export const POST = compose(withLoggerContext, withSpanAttributesAppRouter)(handler);
