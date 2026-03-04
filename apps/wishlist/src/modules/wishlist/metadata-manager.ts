import { EncryptedMetadataManager, type MetadataEntry } from "@saleor/app-sdk/settings-manager";
import { createGraphQLClient } from "@saleor/apps-shared/create-graphql-client";

import { env } from "../../env";

const FETCH_APP_METADATA_QUERY = `
  query WishlistFetchAppMetadata {
    app {
      privateMetadata {
        key
        value
      }
    }
  }
`;

const UPDATE_APP_METADATA_MUTATION = `
  mutation WishlistUpdateAppMetadata($id: ID!, $input: [MetadataInput!]!) {
    updatePrivateMetadata(id: $id, input: $input) {
      errors {
        field
        message
        code
      }
      item {
        ... on App {
          privateMetadata {
            key
            value
          }
        }
      }
    }
  }
`;

const DELETE_APP_METADATA_MUTATION = `
  mutation WishlistDeleteAppMetadata($id: ID!, $keys: [String!]!) {
    deletePrivateMetadata(id: $id, keys: $keys) {
      errors {
        field
        message
        code
      }
    }
  }
`;

type GraphQLClient = ReturnType<typeof createGraphQLClient>;

async function fetchAllMetadata(client: GraphQLClient): Promise<MetadataEntry[]> {
  const { error, data } = await client.query(FETCH_APP_METADATA_QUERY, {}).toPromise();

  if (error) {
    throw new Error(`Failed to fetch app metadata: ${error.message}`);
  }

  const metadata = (data?.app?.privateMetadata ?? []) as Array<{ key: string; value: string }>;

  return metadata.map((entry) => ({ key: entry.key, value: entry.value }));
}

async function mutateMetadata(
  client: GraphQLClient,
  appId: string,
  metadata: MetadataEntry[],
): Promise<MetadataEntry[]> {
  const { error, data } = await client
    .mutation(UPDATE_APP_METADATA_MUTATION, {
      id: appId,
      input: metadata,
    })
    .toPromise();

  if (error) {
    throw new Error(`Failed to update app metadata: ${error.message}`);
  }

  const mutationErrors = data?.updatePrivateMetadata?.errors ?? [];

  if (mutationErrors.length > 0) {
    throw new Error(
      `Metadata update failed: ${mutationErrors
        .map((mutationError: { message?: string }) => mutationError.message ?? "Unknown error")
        .join(", ")}`,
    );
  }

  const updatedMetadata = (data?.updatePrivateMetadata?.item?.privateMetadata ?? []) as Array<{
    key: string;
    value: string;
  }>;

  return updatedMetadata.map((entry) => ({ key: entry.key, value: entry.value }));
}

async function deleteMetadata(
  client: GraphQLClient,
  appId: string,
  keys: string[],
): Promise<void> {
  const { error, data } = await client
    .mutation(DELETE_APP_METADATA_MUTATION, {
      id: appId,
      keys,
    })
    .toPromise();

  if (error) {
    throw new Error(`Failed to delete app metadata: ${error.message}`);
  }

  const mutationErrors = data?.deletePrivateMetadata?.errors ?? [];

  if (mutationErrors.length > 0) {
    throw new Error(
      `Metadata deletion failed: ${mutationErrors
        .map((mutationError: { message?: string }) => mutationError.message ?? "Unknown error")
        .join(", ")}`,
    );
  }
}

export const createSettingsManager = (client: GraphQLClient, appId: string) =>
  new EncryptedMetadataManager({
    encryptionKey: env.SECRET_KEY,
    fetchMetadata: () => fetchAllMetadata(client),
    mutateMetadata: (metadata) => mutateMetadata(client, appId, metadata),
    deleteMetadata: (keys) => deleteMetadata(client, appId, keys),
  });

export const createMetadataClient = (saleorApiUrl: string, token: string) =>
  createGraphQLClient({
    saleorApiUrl,
    token,
  });
