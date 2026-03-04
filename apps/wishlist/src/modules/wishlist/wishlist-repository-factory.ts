import { env } from "../../env";
import { DynamoWishlistRepository } from "./dynamodb-wishlist-repository";
import { InMemoryWishlistRepository } from "./in-memory-wishlist-repository";
import type { WishlistConfig } from "./wishlist-config";
import { isDynamoConfigValid } from "./wishlist-config";
import type { WishlistRepository } from "./wishlist-repository";

const memoryRepositories = new Map<string, WishlistRepository>();

interface GetWishlistRepositoryArgs {
  scope: string;
  config: WishlistConfig;
}

export const getWishlistRepository = ({
  scope,
  config,
}: GetWishlistRepositoryArgs): WishlistRepository => {
  if (config.provider === "dynamodb" && isDynamoConfigValid(config)) {
    return DynamoWishlistRepository.fromConfig({
      tableName: config.dynamodbTableName!,
      region: config.dynamodbRegion!,
      endpoint: config.dynamodbEndpoint,
      requestTimeoutMs: env.DYNAMODB_REQUEST_TIMEOUT_MS,
      connectionTimeoutMs: env.DYNAMODB_CONNECTION_TIMEOUT_MS,
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    });
  }

  const existing = memoryRepositories.get(scope);

  if (existing) {
    return existing;
  }

  const repository = new InMemoryWishlistRepository();

  memoryRepositories.set(scope, repository);

  return repository;
};
