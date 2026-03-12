import type { Metadata } from "next";

import { buildIframeSrc } from "../_shared/build_iframe_src";
import { ProxyThemeStyle } from "../_shared/theme_style";
import { SignClient } from "./_client";

export const metadata: Metadata = {
  title: "Oko Wallet",
};

/**
 * OS-browser signing page.
 *
 * Opened via expo-web-browser's openAuthSessionAsync for every signing request.
 * Loads the attached iframe, reads a signing request from the URL,
 * displays the signing modal, and deep-links the result back to the app.
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
        <SignClient
          iframeSrc={iframeSrc}
          redirectScheme={params.redirect_scheme ?? ""}
        />
      </body>
    </html>
  );
}
