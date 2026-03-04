export type WishlistStorageProvider = "memory" | "dynamodb";

export interface WishlistConfig {
  provider: WishlistStorageProvider;
  dynamodbTableName?: string;
  dynamodbRegion?: string;
  dynamodbEndpoint?: string;
}

export const WISHLIST_CONFIG_KEYS = {
  provider: "WISHLIST_STORAGE_PROVIDER",
  dynamodbTableName: "WISHLIST_DYNAMODB_TABLE_NAME",
  dynamodbRegion: "WISHLIST_DYNAMODB_REGION",
  dynamodbEndpoint: "WISHLIST_DYNAMODB_ENDPOINT",
} as const;

export const normalizeProvider = (value: string | null | undefined): WishlistStorageProvider => {
  return value === "dynamodb" ? "dynamodb" : "memory";
};

export const isDynamoConfigValid = (config: WishlistConfig): boolean => {
  return Boolean(config.dynamodbTableName && config.dynamodbRegion);
};
