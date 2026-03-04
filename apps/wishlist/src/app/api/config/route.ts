import {
  createProtectedHandler,
  type NextAppRouterProtectedHandler,
} from "@saleor/app-sdk/handlers/next-app-router";
import { withSpanAttributesAppRouter } from "@saleor/apps-otel/src/with-span-attributes";
import { compose } from "@saleor/apps-shared/compose";
import { NextResponse } from "next/server";

import { saleorApp } from "../../../../saleor-app";
import { env } from "../../../env";
import { createLogger } from "../../../logger";
import { withLoggerContext } from "../../../logger-context";
import {
  createMetadataClient,
  createSettingsManager,
} from "../../../modules/wishlist/metadata-manager";
import {
  normalizeProvider,
  WISHLIST_CONFIG_KEYS,
  type WishlistConfig,
} from "../../../modules/wishlist/wishlist-config";

const logger = createLogger("wishlistConfigurationHandler");

const getConfig = async (
  settingsManager: ReturnType<typeof createSettingsManager>,
): Promise<WishlistConfig> => {
  const provider = normalizeProvider(
    (await settingsManager.get(WISHLIST_CONFIG_KEYS.provider)) ?? env.WISHLIST_REPOSITORY,
  );
  const dynamodbTableName =
    (await settingsManager.get(WISHLIST_CONFIG_KEYS.dynamodbTableName)) ??
    env.DYNAMODB_MAIN_TABLE_NAME ??
    "";
  const dynamodbRegion =
    (await settingsManager.get(WISHLIST_CONFIG_KEYS.dynamodbRegion)) ?? env.AWS_REGION ?? "";
  const dynamodbEndpoint =
    (await settingsManager.get(WISHLIST_CONFIG_KEYS.dynamodbEndpoint)) ??
    env.DYNAMODB_ENDPOINT ??
    "";

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

const handler: NextAppRouterProtectedHandler = async (request, ctx) => {
  const {
    authData: { token, saleorApiUrl, appId },
  } = ctx;

  const client = createMetadataClient(saleorApiUrl, token);
  const settingsManager = createSettingsManager(client, appId);

  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await getConfig(settingsManager) });
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as ConfigurationPostBody;

      const provider = normalizeProvider(body.provider);
      const dynamodbTableName = body.dynamodbTableName?.trim() || "";
      const dynamodbRegion = body.dynamodbRegion?.trim() || "";
      const dynamodbEndpoint = body.dynamodbEndpoint?.trim() || "";

      if (provider === "dynamodb" && (!dynamodbTableName || !dynamodbRegion)) {
        return NextResponse.json(
          {
            success: false,
            error: "DynamoDB table name and region are required when provider is dynamodb",
          },
          { status: 400 },
        );
      }

      await settingsManager.set([
        { key: WISHLIST_CONFIG_KEYS.provider, value: provider },
        { key: WISHLIST_CONFIG_KEYS.dynamodbTableName, value: dynamodbTableName },
        { key: WISHLIST_CONFIG_KEYS.dynamodbRegion, value: dynamodbRegion },
        { key: WISHLIST_CONFIG_KEYS.dynamodbEndpoint, value: dynamodbEndpoint },
      ]);

      return NextResponse.json({ success: true, data: await getConfig(settingsManager) });
    } catch (error) {
      logger.error("Failed to save wishlist configuration", {
        errorMessage: error instanceof Error ? error.message : "unknown",
      });

      return NextResponse.json(
        { success: false, error: "Invalid configuration payload" },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ success: false, error: "Method not allowed" }, { status: 405 });
};

const protectedHandler = createProtectedHandler(handler, saleorApp.apl, ["MANAGE_APPS"]);

export const GET = compose(withLoggerContext, withSpanAttributesAppRouter)(protectedHandler);
export const POST = compose(withLoggerContext, withSpanAttributesAppRouter)(protectedHandler);
