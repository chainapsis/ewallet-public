import type { Metadata } from "next";

import { OAuthCallbackRedirect } from "./_client";

export const metadata: Metadata = {
  title: "Oko Login",
};

/**
 * OAuth callback landing page (dynamic route for all providers).
 *
 * Handles /google/callback, /x/callback, /discord/callback,
 * /github/callback, and /email/callback.
 *
 * Parses the OAuth response and redirects to /mobile/login/complete.
 */
export default function OAuthCallbackPage() {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "-apple-system, sans-serif",
        }}
      >
        <OAuthCallbackRedirect />
      </body>
    </html>
  );
}
