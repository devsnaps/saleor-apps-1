import { ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_INSTANCE_ID,
} from "@opentelemetry/semantic-conventions/incubating";
import { createBatchSpanProcessor } from "@saleor/apps-otel/src/batch-span-processor-factory";
import { ObservabilityAttributes } from "@saleor/apps-otel/src/observability-attributes";
import { createServiceInstanceId } from "@saleor/apps-otel/src/service-instance-id-factory";
import { registerOTel } from "@vercel/otel";

import packageJson from "../../package.json";
import { env } from "../env";

registerOTel({
  serviceName: env.OTEL_SERVICE_NAME,
  attributes: {
    [ATTR_SERVICE_VERSION]: packageJson.version,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: env.ENV,
    [ATTR_SERVICE_INSTANCE_ID]: createServiceInstanceId(),
    [ObservabilityAttributes.COMMIT_SHA]: env.VERCEL_GIT_COMMIT_SHA,
    [ObservabilityAttributes.REPOSITORY_URL]: env.REPOSITORY_URL,
    env: undefined,
    [ObservabilityAttributes.VERCEL_ENV]: env.VERCEL_ENV,
  },
  spanProcessors: [
    createBatchSpanProcessor({
      accessToken: env.OTEL_ACCESS_TOKEN,
    }),
  ],
});
