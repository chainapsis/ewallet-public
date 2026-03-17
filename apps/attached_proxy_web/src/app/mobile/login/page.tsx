import type { Metadata } from "next";

import { buildIframeSrc } from "../_shared/build_iframe_src";
import { ProxyThemeStyle } from "../_shared/theme_style";
import { EmailLoginClient, OAuthLoginClient } from "./_client";

export const metadata: Metadata = {
  title: "Oko Login",
};

/**
 * OS-browser login entry page.
 *
 * Opened via the mobile SDK's OS browser integration.
 * - Email: redirects directly to Auth0 Universal Login (no iframe).
 * - OAuth: loads attached iframe, requests OAuth URL, redirects to provider.
 */
export default async function MobileLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const provider = params.provider ?? "";
  const apiKey = params.api_key ?? "";
  const redirectScheme = params.redirect_scheme ?? "";
  const hostOrigin = params.host_origin ?? "";
  const clientRandom = params.client_random ?? "";
  const isEmail = provider === "email";

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
        {isEmail ? (
          <EmailLoginClient apiKey={apiKey} redirectScheme={redirectScheme} />
        ) : (
          <OAuthLoginClient
            provider={provider}
            apiKey={apiKey}
            redirectScheme={redirectScheme}
            clientRandom={clientRandom}
            iframeSrc={buildIframeSrc(hostOrigin, apiKey, clientRandom)}
          />
        )}
      </body>
    </html>
  );
}
