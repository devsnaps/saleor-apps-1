import { createProtectedHandler, type NextJsProtectedApiHandler } from "@saleor/app-sdk/handlers/next";
import { wrapWithLoggerContext } from "@saleor/apps-logger/node";
import { withSpanAttributes } from "@saleor/apps-otel/src/with-span-attributes";

import { saleorApp } from "../../../saleor-app";
import { env } from "../../env";
import { createLogger } from "../../logger";
import { loggerContext } from "../../logger-context";
import { createMetadataClient, createSettingsManager } from "../../modules/wishlist/metadata-manager";
import {
  normalizeProvider,
  WISHLIST_CONFIG_KEYS,
  type WishlistConfig,
} from "../../modules/wishlist/wishlist-config";

const logger = createLogger("wishlistConfigurationHandler");

const getConfig = async (settingsManager: ReturnType<typeof createSettingsManager>): Promise<WishlistConfig> => {
  const provider = normalizeProvider(
    (await settingsManager.get(WISHLIST_CONFIG_KEYS.provider)) ?? env.WISHLIST_REPOSITORY,
  );
  const dynamodbTableName =
    (await settingsManager.get(WISHLIST_CONFIG_KEYS.dynamodbTableName)) ?? env.DYNAMODB_MAIN_TABLE_NAME ?? "";
  const dynamodbRegion =
    (await settingsManager.get(WISHLIST_CONFIG_KEYS.dynamodbRegion)) ?? env.AWS_REGION ?? "";
  const dynamodbEndpoint =
    (await settingsManager.get(WISHLIST_CONFIG_KEYS.dynamodbEndpoint)) ?? env.DYNAMODB_ENDPOINT ?? "";

  return {
    provider,
    dynamodbTableName,
    dynamodbRegion,
    dynamodbEndpoint,
  };
};

interface ConfigurationPostBody {
  provider?: string;
  dynamodbTableName?: string;
  dynamodbRegion?: string;
  dynamodbEndpoint?: string;
}

const handler: NextJsProtectedApiHandler = async (request, response, ctx) => {
  const {
    authData: { token, saleorApiUrl, appId },
  } = ctx;

  const client = createMetadataClient(saleorApiUrl, token);
  const settingsManager = createSettingsManager(client, appId);

  switch (request.method) {
    case "GET": {
      return response.json({ success: true, data: await getConfig(settingsManager) });
    }
    case "POST": {
      try {
        const body =
          typeof request.body === "string"
            ? (JSON.parse(request.body) as ConfigurationPostBody)
            : (request.body as ConfigurationPostBody);

        const provider = normalizeProvider(body.provider);
        const dynamodbTableName = body.dynamodbTableName?.trim() || "";
        const dynamodbRegion = body.dynamodbRegion?.trim() || "";
        const dynamodbEndpoint = body.dynamodbEndpoint?.trim() || "";

        if (provider === "dynamodb" && (!dynamodbTableName || !dynamodbRegion)) {
          return response.status(400).json({
            success: false,
            error: "DynamoDB table name and region are required when provider is dynamodb",
          });
        }

        await settingsManager.set([
          { key: WISHLIST_CONFIG_KEYS.provider, value: provider },
          { key: WISHLIST_CONFIG_KEYS.dynamodbTableName, value: dynamodbTableName },
          { key: WISHLIST_CONFIG_KEYS.dynamodbRegion, value: dynamodbRegion },
          { key: WISHLIST_CONFIG_KEYS.dynamodbEndpoint, value: dynamodbEndpoint },
        ]);

        return response.json({ success: true, data: await getConfig(settingsManager) });
      } catch (error) {
        logger.error("Failed to save wishlist configuration", {
          errorMessage: error instanceof Error ? error.message : "unknown",
        });

        return response.status(400).json({ success: false, error: "Invalid configuration payload" });
      }
    }
    default: {
      response.setHeader("Allow", "GET,POST");

      return response.status(405).end();
    }
  }
};

export default wrapWithLoggerContext(
  withSpanAttributes(createProtectedHandler(handler, saleorApp.apl, ["MANAGE_APPS"])),
  loggerContext,
);
