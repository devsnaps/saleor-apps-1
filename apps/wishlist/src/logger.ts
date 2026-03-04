import { attachLoggerConsoleTransport, rootLogger } from "@saleor/apps-logger";
import { createRequire } from "module";

import packageJson from "../package.json";
import { env } from "./env";

const require = createRequire(import.meta.url);

if (env.NODE_ENV === "development") {
  attachLoggerConsoleTransport(rootLogger);
}

if (typeof window === "undefined") {
  const { attachLoggerVercelRuntimeTransport } = require("@saleor/apps-logger/node");

  if (env.NODE_ENV === "production") {
    attachLoggerVercelRuntimeTransport(rootLogger, packageJson.version, require("./logger-context").loggerContext);
  }
}

export const createLogger = (name: string, params?: Record<string, unknown>) =>
  rootLogger.getSubLogger({ name }, params);
