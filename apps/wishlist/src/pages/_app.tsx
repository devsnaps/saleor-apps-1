import "@saleor/macaw-ui/style";

import { AppBridge, AppBridgeProvider } from "@saleor/app-sdk/app-bridge";
import { NoSSRWrapper } from "@saleor/apps-shared/no-ssr-wrapper";
import { ThemeSynchronizer } from "@saleor/apps-shared/theme-synchronizer";
import { Box, ThemeProvider } from "@saleor/macaw-ui";
import { type AppProps } from "next/app";

export const appBridgeInstance = typeof window !== "undefined" ? new AppBridge() : undefined;

function WishlistApp({ Component, pageProps }: AppProps) {
  return (
    <NoSSRWrapper>
      <ThemeProvider>
        <AppBridgeProvider appBridgeInstance={appBridgeInstance}>
          <ThemeSynchronizer />
          <Box padding={10}>
            <Component {...pageProps} />
          </Box>
        </AppBridgeProvider>
      </ThemeProvider>
    </NoSSRWrapper>
  );
}

export default WishlistApp;
