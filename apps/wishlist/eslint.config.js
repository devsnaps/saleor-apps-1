import { config } from "@saleor/eslint-config-apps/index.js";
import nodePlugin from "eslint-plugin-n";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    name: "saleor-app-wishlist/custom-config",
    files: ["**/*.ts"],
    plugins: {
      n: nodePlugin,
    },
    rules: {
      "n/no-process-env": "error",
    },
  },
  {
    name: "saleor-app-wishlist/override-no-process-env",
    files: ["next.config.ts", "src/env.ts", "src/instrumentation.ts", "src/instrumentations/*"],
    rules: {
      "n/no-process-env": "off",
    },
  },
];
