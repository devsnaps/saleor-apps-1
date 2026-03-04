import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import type { WishlistFilter, WishlistItem } from "./wishlist-item";
import type { WishlistRepository } from "./wishlist-repository";

const VARIANT_PREFIX = "VARIANT#";

const createPartitionKey = (filter: { channel: string; userId: string }) =>
  `WISHLIST#${filter.channel}#${filter.userId}`;
const createSortKey = (productVariantId: string) => `${VARIANT_PREFIX}${productVariantId}`;

interface DynamoWishlistConfig {
  tableName: string;
  region: string;
  endpoint?: string;
  requestTimeoutMs: number;
  connectionTimeoutMs: number;
  accessKeyId?: string;
  secretAccessKey?: string;
}

const createDocumentClient = (config: DynamoWishlistConfig) => {
  const client = new DynamoDBClient({
    endpoint: config.endpoint || undefined,
    region: config.region,
    requestHandler: {
      requestTimeout: config.requestTimeoutMs,
      connectionTimeout: config.connectionTimeoutMs,
    },
    credentials:
      config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          }
        : undefined,
  });

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
};

type DynamoWishlistRecord = {
  PK: string;
  SK: string;
  channel: string;
  userId: string;
  productVariantId: string;
};

export class DynamoWishlistRepository implements WishlistRepository {
  private tableName: string;
  private documentClient: DynamoDBDocumentClient;

  constructor(tableName: string, documentClient?: DynamoDBDocumentClient) {
    this.tableName = tableName;
    this.documentClient =
      documentClient ??
      createDocumentClient({
        tableName,
        region: "us-east-1",
        requestTimeoutMs: 4000,
        connectionTimeoutMs: 2000,
      });
  }

  static fromConfig(config: DynamoWishlistConfig) {
    const documentClient = createDocumentClient(config);

    return new DynamoWishlistRepository(config.tableName, documentClient);
  }

  async add(item: WishlistItem): Promise<WishlistItem> {
    await this.documentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: createPartitionKey(item),
          SK: createSortKey(item.productVariantId),
          channel: item.channel,
          userId: item.userId,
          productVariantId: item.productVariantId,
          updatedAt: new Date().toISOString(),
        },
      }),
    );

    return item;
  }

  async list(filter: WishlistFilter): Promise<WishlistItem[]> {
    const queryResult = await this.documentClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": createPartitionKey(filter),
          ":skPrefix": VARIANT_PREFIX,
        },
      }),
    );

    const records = (queryResult.Items ?? []) as DynamoWishlistRecord[];

    return records
      .filter((record) => Boolean(record.channel && record.userId && record.productVariantId))
      .map((record) => ({
        channel: record.channel,
        userId: record.userId,
        productVariantId: record.productVariantId,
      }));
  }

  async remove(item: WishlistItem): Promise<boolean> {
    const result = await this.documentClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: createPartitionKey(item),
          SK: createSortKey(item.productVariantId),
        },
        ReturnValues: "ALL_OLD",
      }),
    );

    return Boolean(result.Attributes);
  }
}
