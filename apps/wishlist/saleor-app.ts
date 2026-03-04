import { type APL } from "@saleor/app-sdk/APL";
import { FileAPL } from "@saleor/app-sdk/APL/file";
import { UpstashAPL } from "@saleor/app-sdk/APL/upstash";
import { SaleorApp } from "@saleor/app-sdk/saleor-app";

import { env } from "./src/env";

let apl: APL;

switch (env.APL) {
  case "upstash":
    apl = new UpstashAPL();
    break;
  case "file":
  default:
    apl = new FileAPL();
    break;
}

export const saleorApp = new SaleorApp({ apl });
