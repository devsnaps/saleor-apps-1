import { type NextRequest, NextResponse } from "next/server";

import { saleorApp } from "../../../../../saleor-app";
import { env } from "../../../../env";
import { createLogger } from "../../../../logger";
import {
  createMetadataClient,
  createSettingsManager,
} from "../../../../modules/wishlist/metadata-manager";
import {
  normalizeProvider,
  WISHLIST_CONFIG_KEYS,
} from "../../../../modules/wishlist/wishlist-config";
import { getWishlistRepository } from "../../../../modules/wishlist/wishlist-repository-factory";
import { WishlistService } from "../../../../modules/wishlist/wishlist-service";

type WishlistMutationBody = {
  channel?: string;
  userId?: string;
  productVariantId?: string;
};

const logger = createLogger("wishlistItemsHandler");

const resolveAuthToken = (authorization: string | null, authorizationBearer: string | null) => {
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  if (authorizationBearer?.startsWith("Bearer ")) {
    return authorizationBearer.slice("Bearer ".length).trim();
  }

  return (authorizationBearer || authorization || "").trim() || null;
};

const createWishlistService = async (request: NextRequest) => {
  const saleorApiUrl =
    request.headers.get("saleor-api-url") ?? request.headers.get("x-saleor-api-url");

  if (!saleorApiUrl) {
    return {
      error: NextResponse.json({ error: "Missing saleor-api-url header" }, { status: 400 }),
    };
  }

  const incomingToken = resolveAuthToken(
    request.headers.get("authorization"),
    request.headers.get("authorization-bearer"),
  );

  if (!incomingToken) {
    return { error: NextResponse.json({ error: "Missing authorization token" }, { status: 401 }) };
  }

  const aplEntry = await saleorApp.apl.get(saleorApiUrl);

  if (!aplEntry) {
    return {
      error: NextResponse.json(
        { error: "App is not registered for this Saleor instance" },
        { status: 401 },
      ),
    };
  }

  if (aplEntry.token !== incomingToken) {
    return { error: NextResponse.json({ error: "Invalid app token" }, { status: 401 }) };
  }

  const config = {
    provider: normalizeProvider(env.WISHLIST_REPOSITORY),
    dynamodbTableName: env.DYNAMODB_MAIN_TABLE_NAME ?? "",
    dynamodbRegion: env.AWS_REGION ?? "",
    dynamodbEndpoint: env.DYNAMODB_ENDPOINT ?? "",
  } as const;

  try {
    const metadataClient = createMetadataClient(aplEntry.saleorApiUrl, aplEntry.token);
    const settingsManager = createSettingsManager(metadataClient, aplEntry.appId);

    const provider = await settingsManager.get(WISHLIST_CONFIG_KEYS.provider);
    const dynamodbTableName = await settingsManager.get(WISHLIST_CONFIG_KEYS.dynamodbTableName);
    const dynamodbRegion = await settingsManager.get(WISHLIST_CONFIG_KEYS.dynamodbRegion);
    const dynamodbEndpoint = await settingsManager.get(WISHLIST_CONFIG_KEYS.dynamodbEndpoint);

    (config.provider as "memory" | "dynamodb") = normalizeProvider(provider ?? config.provider);
    (config.dynamodbTableName as string) = dynamodbTableName ?? config.dynamodbTableName;
    (config.dynamodbRegion as string) = dynamodbRegion ?? config.dynamodbRegion;
    (config.dynamodbEndpoint as string) = dynamodbEndpoint ?? config.dynamodbEndpoint;
  } catch (error) {
    logger.warn("Failed to read wishlist metadata config, falling back to env", {
      saleorApiUrl: aplEntry.saleorApiUrl,
      appId: aplEntry.appId,
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
  }

  return {
    wishlistService: new WishlistService(
      getWishlistRepository({
        scope: `${aplEntry.saleorApiUrl}#${aplEntry.appId}`,
        config,
      }),
    ),
  };
};

export const GET = async (request: NextRequest) => {
  try {
    const resolved = await createWishlistService(request);

    if ("error" in resolved) {
      return resolved.error;
    }

    const channel = request.nextUrl.searchParams.get("channel") ?? undefined;
    const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
    const items = await resolved.wishlistService.list({ channel, userId });

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";

    logger.error("Wishlist endpoint failed", { errorMessage: message });

    return NextResponse.json({ error: message }, { status: 400 });
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const resolved = await createWishlistService(request);

    if ("error" in resolved) {
      return resolved.error;
    }

    const body = (await request.json()) as WishlistMutationBody;
    const item = await resolved.wishlistService.add(body);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";

    logger.error("Wishlist endpoint failed", { errorMessage: message });

    return NextResponse.json({ error: message }, { status: 400 });
  }
};

export const DELETE = async (request: NextRequest) => {
  try {
    const resolved = await createWishlistService(request);

    if ("error" in resolved) {
      return resolved.error;
    }

    const body = (await request.json()) as WishlistMutationBody;
    const deleted = await resolved.wishlistService.remove(body);

    return NextResponse.json({ deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";

    logger.error("Wishlist endpoint failed", { errorMessage: message });

    return NextResponse.json({ error: message }, { status: 400 });
  }
};
