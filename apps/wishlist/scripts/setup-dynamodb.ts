/* eslint-disable no-console */
import { parseArgs } from "node:util";

import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";

import { env } from "../src/env";

const tableName = env.DYNAMODB_MAIN_TABLE_NAME;

if (!tableName) {
  console.error("Missing DYNAMODB_MAIN_TABLE_NAME env variable");
  process.exit(1);
}

try {
  const {
    values: { "endpoint-url": endpointUrl },
  } = parseArgs({
    args: process.argv.slice(2),
    options: {
      "endpoint-url": {
        type: "string",
        short: "e",
        default: env.DYNAMODB_ENDPOINT || "http://localhost:8001",
      },
    },
  });

  const region = env.AWS_REGION || "localhost";

  console.log(`Starting DynamoDB setup with endpoint: ${endpointUrl}`);
  console.log(`Using table name: ${tableName}`);
  console.log(`Using region: ${region}`);

  const dynamoClient = new DynamoDBClient({
    endpoint: endpointUrl,
    region,
    credentials:
      env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          }
        : {
            accessKeyId: "local",
            secretAccessKey: "local",
          },
  });

  const createTableIfNotExists = async (targetTableName: string) => {
    try {
      const possibleTable = await dynamoClient.send(
        new DescribeTableCommand({
          TableName: targetTableName,
        }),
      );

      if (possibleTable.Table) {
        console.log(`Table ${targetTableName} already exists - creation is skipped`);

        return;
      }
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        console.log(`Table ${targetTableName} does not exist, proceeding with creation.`);
      } else {
        throw error;
      }
    }

    const createTableCommand = new CreateTableCommand({
      TableName: targetTableName,
      AttributeDefinitions: [
        {
          AttributeName: "PK",
          AttributeType: "S",
        },
        {
          AttributeName: "SK",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "PK",
          KeyType: "HASH",
        },
        {
          AttributeName: "SK",
          KeyType: "RANGE",
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    });

    await dynamoClient.send(createTableCommand);
    console.log(`Table ${targetTableName} created successfully`);
  };

  await createTableIfNotExists(tableName);

  console.log("DynamoDB setup completed successfully");
  process.exit(0);
} catch (error) {
  console.error("Error setting up DynamoDB:", error);
  process.exit(1);
}
