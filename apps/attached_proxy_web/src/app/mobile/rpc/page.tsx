import type { Metadata } from "next";

import { buildIframeSrc } from "../_shared/build_iframe_src";
import { ProxyThemeStyle } from "../_shared/theme_style";
import { RpcClient } from "./_client";

export const metadata: Metadata = {
  title: "Oko Wallet",
};

/**
 * Generic RPC page for mobile SDK.
 *
 * Receives a method name and encoded payload via URL,
 * loads the attached iframe, forwards the request via postMessage,
 * and deep-links the result back to the app.
 */
export default async function MobileRpcPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const clientRandom = params.client_random ?? "";
  const iframeSrc = buildIframeSrc(
    params.host_origin ?? "",
    params.api_key ?? "",
    clientRandom,
  );

  return (
    <html
      lang="en"
      style={{ margin: 0, padding: 0, width: "100%", height: "100%" }}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ProxyThemeStyle />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "-apple-system, sans-serif",
        }}
      >
        <RpcClient
          iframeSrc={iframeSrc}
          method={params.method ?? ""}
          redirectScheme={params.redirect_scheme ?? ""}
          expectedPublicKey={params.expected_pk ?? null}
        />
      </body>
    </html>
  );
}
