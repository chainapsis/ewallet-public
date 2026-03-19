import type { OkoWalletMsgGenerateOAuthUrlAck } from "@oko-wallet/oko-sdk-core";
import { type RefObject, useEffect, useState } from "react";

import { parseClientRandomFromHash } from "../_shared/parse_client_random";
import { sendToAttached } from "../_shared/send_to_attached";
import { StatusScreen } from "../_shared/status_screen";
import { useAttachedInit } from "../_shared/use_attached_init";

const AUTH0_DOMAIN = "auth0.oko.app";
const AUTH0_CLIENT_ID = "GnPcFAjGKAcXZpAzQ8vGBmzfcfV2hu1Q";
const AUTH0_CONNECTION = "email";

// ---------------------------------------------------------------------------
// Email login — no iframe, redirect straight to Auth0
// ---------------------------------------------------------------------------

export function EmailLoginClient({
  apiKey,
  redirectScheme,
}: {
  apiKey: string;
  redirectScheme: string;
}) {
  const [status, setStatus] = useState("Preparing sign-in...");

  useEffect(() => {
    (async () => {
      if (redirectScheme) {
        sessionStorage.setItem("oko_mobile_redirect_scheme", redirectScheme);
      }
      sessionStorage.setItem("oko_mobile_api_key", apiKey);
      const clientRandom = parseClientRandomFromHash();
      if (clientRandom) {
        sessionStorage.setItem("oko_mobile_client_random", clientRandom);
      }

      // Generate nonce
      const nonceBytes = new Uint8Array(16);
      crypto.getRandomValues(nonceBytes);
      const nonce = Array.from(nonceBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      sessionStorage.setItem("oko_mobile_email_nonce", nonce);

      // Build Auth0 URL and redirect
      const auth0Url = new URL(`https://${AUTH0_DOMAIN}/authorize`);
      auth0Url.searchParams.set("client_id", AUTH0_CLIENT_ID);
      auth0Url.searchParams.set(
        "redirect_uri",
        `${window.location.origin}/email/callback`,
      );
      auth0Url.searchParams.set("response_type", "token id_token");
      auth0Url.searchParams.set("scope", "openid profile email");
      auth0Url.searchParams.set("connection", AUTH0_CONNECTION);
      auth0Url.searchParams.set("nonce", nonce);
      auth0Url.searchParams.set(
        "state",
        JSON.stringify({
          apiKey,
          targetOrigin: window.location.origin,
          provider: "auth0",
          redirectScheme,
          mobileOsBrowser: true,
        }),
      );

      setStatus("Redirecting to email login...");
      window.location.href = auth0Url.toString();
    })();
  }, [apiKey, redirectScheme]);

  return (
    <StatusScreen
      title={status}
      tone={status.startsWith("Error:") ? "error" : "default"}
    />
  );
}

// ---------------------------------------------------------------------------
// OAuth login — iframe + generate_oauth_url
// ---------------------------------------------------------------------------

export function OAuthLoginClient({
  iframeRef,
  provider,
  apiKey,
  redirectScheme,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  provider: string;
  apiKey: string;
  redirectScheme: string;
}) {
  const [status, setStatus] = useState("Preparing sign-in...");

  useEffect(() => {
    if (redirectScheme) {
      sessionStorage.setItem("oko_mobile_redirect_scheme", redirectScheme);
    }
    sessionStorage.setItem("oko_mobile_api_key", apiKey);
    const clientRandom = parseClientRandomFromHash();
    if (clientRandom) {
      sessionStorage.setItem("oko_mobile_client_random", clientRandom);
    }
  }, [apiKey, redirectScheme]);

  useAttachedInit((payload) => {
    if (payload && !payload.success) {
      setStatus(
        `Error: wallet initialization failed — ${payload.err || "unknown"}`,
      );
      console.error("[oko-mobile-login] attached init failed:", payload);
      return;
    }

    setStatus(`Redirecting to ${provider}...`);
    requestOAuthUrl();
  });

  async function requestOAuthUrl() {
    try {
      const result = await sendToAttached<OkoWalletMsgGenerateOAuthUrlAck>(
        iframeRef.current!,
        {
          target: "oko_attached",
          msg_type: "generate_oauth_url",
          payload: {
            provider,
            apiKey,
            targetOrigin: window.location.origin,
            redirectScheme,
            mobileOsBrowser: true,
          },
        },
      );

      if (
        result.msg_type === "generate_oauth_url_ack" &&
        result.payload?.success
      ) {
        window.location.href = result.payload.data.url;
      } else {
        setStatus("Failed to generate OAuth URL");
        console.error("[oko-mobile-login] generate_oauth_url failed:", result);
      }
    } catch (err) {
      setStatus("Failed to generate OAuth URL");
      console.error("[oko-mobile-login] generate_oauth_url error:", err);
    }
  }

  return (
    <StatusScreen
      title={status}
      tone={status.startsWith("Error:") ? "error" : "default"}
    />
  );
}
