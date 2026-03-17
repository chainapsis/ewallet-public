"use client";

import type { OkoWalletMsgGenerateOAuthUrlAck } from "@oko-wallet/oko-sdk-core";
import { useEffect, useMemo, useRef, useState } from "react";

import { parseClientRandomFromHash } from "../_shared/parse_client_random";
import { sendToAttached } from "../_shared/send_to_attached";
import { useAttachedInit } from "../_shared/use_attached_init";

const AUTH0_DOMAIN = "auth0.oko.app";
const AUTH0_CLIENT_ID = "GnPcFAjGKAcXZpAzQ8vGBmzfcfV2hu1Q";
const AUTH0_CONNECTION = "email";

const statusStyle = {
  textAlign: "center" as const,
  fontSize: 16,
};

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

  return <div style={statusStyle}>{status}</div>;
}

// ---------------------------------------------------------------------------
// OAuth login — iframe + generate_oauth_url
// ---------------------------------------------------------------------------

export function OAuthLoginClient({
  provider,
  apiKey,
  redirectScheme,
  iframeSrc,
}: {
  provider: string;
  apiKey: string;
  redirectScheme: string;
  iframeSrc: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("Preparing sign-in...");

  const clientRandom = useMemo(() => parseClientRandomFromHash(), []);

  // Inject clientRandom from fragment into iframe src
  const resolvedIframeSrc = useMemo(() => {
    if (!clientRandom) return iframeSrc;
    const url = new URL(iframeSrc);
    url.searchParams.set("client_random", clientRandom);
    return url.toString();
  }, [iframeSrc, clientRandom]);

  useEffect(() => {
    if (redirectScheme) {
      sessionStorage.setItem("oko_mobile_redirect_scheme", redirectScheme);
    }
    sessionStorage.setItem("oko_mobile_api_key", apiKey);
    if (clientRandom) {
      sessionStorage.setItem("oko_mobile_client_random", clientRandom);
    }
  }, [apiKey, redirectScheme, clientRandom]);

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
    <>
      <div style={statusStyle}>{status}</div>
      <iframe
        id="oko-attached"
        title="Oko Wallet"
        ref={iframeRef}
        src={resolvedIframeSrc}
        style={{ display: "none" }}
      />
    </>
  );
}
