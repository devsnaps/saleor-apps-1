import { useAppBridge, useAuthenticatedFetch } from "@saleor/app-sdk/app-bridge";
import { Box, Button, Input, Text } from "@saleor/macaw-ui";
import { type FormEvent, useEffect, useState } from "react";

type ProviderValue = "memory" | "dynamodb";

interface ConfigurationResponse {
  success: boolean;
  data: {
    provider: ProviderValue;
    dynamodbTableName: string;
    dynamodbRegion: string;
    dynamodbEndpoint: string;
  };
}

export default function ConfigurationPage() {
  const { appBridgeState } = useAppBridge();
  const authenticatedFetch = useAuthenticatedFetch() as typeof window.fetch;

  const isDashboardContext = Boolean(appBridgeState?.ready);

  const [provider, setProvider] = useState<ProviderValue>("memory");
  const [dynamodbTableName, setDynamodbTableName] = useState("");
  const [dynamodbRegion, setDynamodbRegion] = useState("");
  const [dynamodbEndpoint, setDynamodbEndpoint] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isDashboardContext) {
      return;
    }

    authenticatedFetch("/api/configuration", { method: "GET" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load configuration");
        }

        const payload = (await response.json()) as ConfigurationResponse;

        setProvider(payload.data.provider);
        setDynamodbTableName(payload.data.dynamodbTableName || "");
        setDynamodbRegion(payload.data.dynamodbRegion || "");
        setDynamodbEndpoint(payload.data.dynamodbEndpoint || "");
      })
      .catch(() => {
        setStatusMessage("Failed to load configuration. Check app permissions and installation status.");
      })
      .finally(() => setLoading(false));
  }, [authenticatedFetch, isDashboardContext]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setStatusMessage(null);

    try {
      const response = await authenticatedFetch("/api/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          dynamodbTableName,
          dynamodbRegion,
          dynamodbEndpoint,
        }),
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      setStatusMessage("Configuration saved.");
    } catch {
      setStatusMessage("Configuration save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!isDashboardContext) {
    return (
      <Box display="grid" gap={6}>
        <Text as="h1" size={10}>
          Saleor Wishlist App
        </Text>
        <Text as="p" size={6}>
          This app can only be used within the Saleor Dashboard.
        </Text>
      </Box>
    );
  }

  if (loading) {
    return <Text>Loading configuration...</Text>;
  }

  return (
    <Box display="grid" gap={6}>
      <Box>
        <Text as="h1" size={8}>
          Wishlist Configuration
        </Text>
        <Text as="p" color="default2" marginTop={2}>
          Configure storage in Dashboard. AWS credentials should remain in environment variables.
        </Text>
      </Box>

      <Box as="form" onSubmit={onSubmit} display="grid" gap={4}>
        <Input
          label="Storage Provider (memory | dynamodb)"
          name="provider"
          value={provider}
          onChange={(event) =>
            setProvider(event.currentTarget.value === "dynamodb" ? "dynamodb" : "memory")
          }
        />

        <Input
          label="DynamoDB Table Name"
          name="dynamodbTableName"
          value={dynamodbTableName}
          onChange={(event) => setDynamodbTableName(event.currentTarget.value)}
          disabled={provider !== "dynamodb"}
        />

        <Input
          label="DynamoDB Region"
          name="dynamodbRegion"
          value={dynamodbRegion}
          onChange={(event) => setDynamodbRegion(event.currentTarget.value)}
          disabled={provider !== "dynamodb"}
        />

        <Input
          label="DynamoDB Endpoint (optional)"
          name="dynamodbEndpoint"
          value={dynamodbEndpoint}
          onChange={(event) => setDynamodbEndpoint(event.currentTarget.value)}
          disabled={provider !== "dynamodb"}
        />

        <Box>
          <Button type="submit" disabled={saving} variant="primary">
            {saving ? "Saving..." : "Save configuration"}
          </Button>
        </Box>
      </Box>

      {statusMessage ? <Text>{statusMessage}</Text> : null}
    </Box>
  );
}
