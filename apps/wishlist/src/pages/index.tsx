import { useAppBridge } from "@saleor/app-sdk/app-bridge";
import { isInIframe } from "@saleor/apps-shared/is-in-iframe";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";

const IndexPage: NextPage = () => {
  const { appBridgeState } = useAppBridge();
  const { replace } = useRouter();

  useEffect(() => {
    if (appBridgeState?.ready) {
      void replace("/config");
    }
  }, [appBridgeState?.ready, replace]);

  if (isInIframe()) {
    return <span>Loading...</span>;
  }

  return (
    <div>
      <h1>Saleor Wishlist App</h1>
      <p>
        This is Saleor App that allows customers to save products to a wishlist and retrieve them
        later.
      </p>
      <p>Install the app in your Saleor instance and open it in Dashboard.</p>
    </div>
  );
};

export default IndexPage;
