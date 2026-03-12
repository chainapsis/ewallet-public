import type { Metadata } from "next";

import { buildIframeSrc } from "../_shared/build_iframe_src";
import { ProxyThemeStyle } from "../_shared/theme_style";
import { SignOutClient } from "./_client";

export const metadata: Metadata = {
  title: "Oko Wallet",
};

export default async function MobileSignOutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const iframeSrc = buildIframeSrc(params.host_origin ?? "", "");

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
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system, sans-serif",
        }}
      >
        <SignOutClient
          iframeSrc={iframeSrc}
          redirectScheme={params.redirect_scheme ?? ""}
        />
      </body>
    </html>
  );
}
