"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { sendToAttached } from "../../_shared/send_to_attached";
import { useAttachedInit } from "../../_shared/use_attached_init";

export function LoginCompleteClient({
  iframeSrc,
  oauthParams,
}: {
  iframeSrc: string;
  oauthParams: Record<string, string>;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("Completing sign-in...");

  // Session data read from sessionStorage on mount
  const sessionDataRef = useRef<{
    sessionId: string;
    redirectScheme: string;
    oauthPayload: Record<string, string>;
  } | null>(null);

  // Read session data and validate OAuth payload on mount
  useEffect(() => {
    const sessionId = sessionStorage.getItem("oko_mobile_session_id");
    const redirectScheme =
      sessionStorage.getItem("oko_mobile_redirect_scheme") || "";
    const apiKey = sessionStorage.getItem("oko_mobile_api_key") || "";

    if (!sessionId) {
      setStatus("Error: missing session data. Please try again.");
      console.error(
        "[oko-mobile-login-complete] missing session_id from sessionStorage",
      );
      return;
    }

    const provider = oauthParams.provider || "";
    const oauthPayload = buildOAuthPayload(oauthParams, apiKey, provider);

    if (!oauthPayload) {
      setStatus(
        `Error: invalid OAuth response. Provider=${provider}, keys=${Object.keys(oauthParams).join(",")}`,
      );
      console.error(
        "[oko-mobile-login-complete] invalid OAuth response:",
        oauthParams,
      );
      return;
    }

    sessionDataRef.current = { sessionId, redirectScheme, oauthPayload };
  }, [oauthParams]);

  // Handle init from attached iframe
  useAttachedInit((payload) => {
    if (!sessionDataRef.current) {
      return;
    }

    if (payload && !payload.success) {
      setStatus(
        `Error: wallet initialization failed — ${payload.err || "unknown"}`,
      );
      console.error(
        "[oko-mobile-login-complete] attached init failed:",
        payload,
      );
      return;
    }

    setStatus("Processing sign-in...");

    // Inject nonce for email login (generated in /mobile/login, not in attached)
    const emailNonce = sessionStorage.getItem("oko_mobile_email_nonce");
    if (emailNonce && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          target: "oko_attached",
          msg_type: "set_reauth_params",
          payload: { nonce: emailNonce },
        },
        window.location.origin,
      );
      sessionStorage.removeItem("oko_mobile_email_nonce");
    }

    // Send OAuth tokens to attached for keygen
    sendToAttached(iframeRef.current!, {
      target: "oko_attached",
      msg_type: "oauth_info_pass",
      payload: sessionDataRef.current.oauthPayload,
    }).then((ack) => {
      console.log("[oko-mobile-login-complete] oauth_info_pass_ack:", ack);
    });
  });

  const handleKeygenComplete = useCallback(async () => {
    try {
      setStatus("Finalizing...");

      const walletData = readWalletFromLocalStorage();
      if (!walletData) {
        throw new Error("Wallet data not found in localStorage after keygen");
      }

      const res = await fetch("/api/mobile/sign-relay/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: walletData,
          key: sessionDataRef.current!.sessionId,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error("Failed to store wallet info in relay");
      }

      // Close OS browser by navigating to callback scheme
      const redirectScheme = sessionDataRef.current?.redirectScheme;
      if (redirectScheme) {
        window.location.href = `${redirectScheme}://`;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`Error: ${message}`);
      console.error("[oko-mobile-login-complete] error:", err);
    }
  }, []);

  // Listen for oauth_sign_in_update (keygen complete — separate from init)
  useEffect(() => {
    const origin = window.location.origin;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== origin) {
        return;
      }
      const msg = event.data;
      if (!msg || typeof msg !== "object") {
        return;
      }

      if (msg.msg_type === "oauth_sign_in_update") {
        event.ports?.[0]?.postMessage({
          target: "oko_attached",
          msg_type: "oauth_sign_in_update_ack",
          payload: null,
        });
        setStatus("Securing wallet...");
        handleKeygenComplete();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleKeygenComplete]);

  return (
    <>
      <div
        style={{
          textAlign: "center",
          color: "#666",
          fontSize: 16,
          padding: 20,
        }}
      >
        {status}
      </div>
      <iframe
        id="oko-attached"
        title="Oko Wallet"
        ref={iframeRef}
        src={iframeSrc}
        style={{ display: "none" }}
      />
    </>
  );
}

function readWalletFromLocalStorage() {
  try {
    const raw = localStorage.getItem("oko-wallet-app-2");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    const origin = window.location.origin;
    const wallet = parsed?.state?.perOrigin?.[origin]?.wallet;
    if (!wallet) {
      return null;
    }
    return {
      authType: wallet.authType || null,
      publicKey: wallet.publicKey || null,
      email: wallet.email || null,
      name: wallet.name || null,
    };
  } catch (e) {
    console.error(
      "[oko-mobile-login-complete] failed to read wallet from localStorage:",
      e,
    );
    return null;
  }
}

function buildOAuthPayload(
  params: Record<string, string>,
  apiKey: string,
  provider: string,
): Record<string, string> | null {
  const base: Record<string, string> = {
    provider,
    api_key: apiKey,
    target_origin: window.location.origin,
    auth_type: params.auth_type || provider,
  };

  // Token-based flow (Google, Email/Auth0)
  if (params.access_token || params.id_token) {
    base.access_token = params.access_token || "";
    base.id_token = params.id_token || "";
    return base;
  }

  // Code-based flow (X, Discord, GitHub)
  if (params.code) {
    base.code = params.code;
    return base;
  }

  return null;
}
