import { type NextApiHandler } from "next";

import { saleorApp } from "../../../../saleor-app";
import { env } from "../../../env";
import { createLogger } from "../../../logger";
import { createMetadataClient, createSettingsManager } from "../../../modules/wishlist/metadata-manager";
import { normalizeProvider, WISHLIST_CONFIG_KEYS } from "../../../modules/wishlist/wishlist-config";
import { getWishlistRepository } from "../../../modules/wishlist/wishlist-repository-factory";
import { WishlistService } from "../../../modules/wishlist/wishlist-service";

type WishlistMutationBody = {
  channel?: string;
  userId?: string;
  productVariantId?: string;
};

const logger = createLogger("wishlistItemsHandler");

const resolveAuthToken = (authorization: string | undefined, authorizationBearer: string | undefined) => {
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  if (authorizationBearer?.startsWith("Bearer ")) {
    return authorizationBearer.slice("Bearer ".length).trim();
  }

  return (authorizationBearer || authorization || "").trim() || null;
};

const parseBody = <T>(body: unknown): T => {
  if (typeof body === "string") {
    return JSON.parse(body) as T;
  }

  return body as T;
};

const handler: NextApiHandler = async (request, response) => {
  try {
    const saleorApiUrlHeader = request.headers["saleor-api-url"] ?? request.headers["x-saleor-api-url"];
    const saleorApiUrl = Array.isArray(saleorApiUrlHeader) ? saleorApiUrlHeader[0] : saleorApiUrlHeader;

    if (!saleorApiUrl) {
      return response.status(400).json({ error: "Missing saleor-api-url header" });
    }

    const authorizationHeader = request.headers.authorization;
    const authorizationBearerHeader = request.headers["authorization-bearer"];

    const incomingToken = resolveAuthToken(
      Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader,
      Array.isArray(authorizationBearerHeader) ? authorizationBearerHeader[0] : authorizationBearerHeader,
    );

    if (!incomingToken) {
      return response.status(401).json({ error: "Missing authorization token" });
    }

    const aplEntry = await saleorApp.apl.get(saleorApiUrl);

    if (!aplEntry) {
      return response.status(401).json({ error: "App is not registered for this Saleor instance" });
    }

    if (aplEntry.token !== incomingToken) {
      return response.status(401).json({ error: "Invalid app token" });
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

    const wishlistService = new WishlistService(
      getWishlistRepository({
        scope: `${aplEntry.saleorApiUrl}#${aplEntry.appId}`,
        config,
      }),
    );

    if (request.method === "GET") {
      const channel = Array.isArray(request.query.channel) ? request.query.channel[0] : request.query.channel;
      const userId = Array.isArray(request.query.userId) ? request.query.userId[0] : request.query.userId;
      const result = await wishlistService.list({ channel, userId });

      return response.json({ items: result });
    }

    if (request.method === "POST") {
      const body = parseBody<WishlistMutationBody>(request.body);
      const result = await wishlistService.add(body);

      return response.status(201).json({ item: result });
    }

    if (request.method === "DELETE") {
      const body = parseBody<WishlistMutationBody>(request.body);
      const deleted = await wishlistService.remove(body);

      return response.json({ deleted });
    }

    response.setHeader("Allow", "GET,POST,DELETE");

    return response.status(405).end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";

    logger.error("Wishlist endpoint failed", {
      errorMessage: message,
    });

    return response.status(400).json({ error: message });
  }
};

export default handler;
