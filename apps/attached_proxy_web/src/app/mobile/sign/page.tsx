import type { Metadata } from "next";

import { buildIframeSrc } from "../_shared/build_iframe_src";
import { SignClient } from "./_client";

export const metadata: Metadata = {
  title: "Oko Wallet",
};

/**
 * OS-browser signing page.
 *
 * Opened via expo-web-browser's openAuthSessionAsync for every signing request.
 * Loads the attached iframe, consumes a signing request from the relay,
 * displays the signing modal, and stores the result back in the relay.
 */
export default async function MobileSignPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const iframeSrc = buildIframeSrc(
    params.host_origin ?? "",
    params.api_key ?? "",
  );

  return (
    <html
      lang="en"
      style={{ margin: 0, padding: 0, width: "100%", height: "100%" }}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
          background: "#f5f5f5",
        }}
      >
        <SignClient
          iframeSrc={iframeSrc}
          relayCode={params.relay_code ?? ""}
          redirectScheme={params.redirect_scheme ?? ""}
        />
      </body>
    </html>
  );
}
