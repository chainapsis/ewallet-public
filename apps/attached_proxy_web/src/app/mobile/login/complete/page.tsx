import type { Metadata } from "next";

import { buildIframeSrc } from "../../_shared/build_iframe_src";
import { LoginCompleteClient } from "./_client";

export const metadata: Metadata = {
  title: "Oko Login",
};

/**
 * OS-browser login completion page.
 *
 * Loaded after OAuth callback redirects here with tokens.
 * Sends oauth_info_pass to attached iframe (triggers keygen),
 * waits for completion, then stores wallet info in the relay.
 */
export default async function MobileLoginCompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const iframeSrc = buildIframeSrc(
    params.host_origin ?? "",
    params.api_key ?? "",
  );

  // Pass all query params to the client (filter undefined values)
  const oauthParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      oauthParams[key] = value;
    }
  }

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
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system, sans-serif",
          background: "#f5f5f5",
        }}
      >
        <LoginCompleteClient iframeSrc={iframeSrc} oauthParams={oauthParams} />
      </body>
    </html>
  );
}
