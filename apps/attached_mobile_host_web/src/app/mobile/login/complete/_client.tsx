import type {
  OkoWalletMsgGetWalletInfoAck,
  OkoWalletMsgOAuthInfoPassAck,
  OkoWalletMsgOAuthSignInUpdate,
} from "@oko-wallet/oko-sdk-core";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ATTACHED_ORIGIN } from "../../_shared/build_iframe_src";
import {
  encodeLoginResultPayloadWithStats,
  LOGIN_URL_CODEC_VERSION,
  LOGIN_URL_RESULT_PARAM,
  LOGIN_URL_VERSION_PARAM,
  type LoginWalletInfo,
} from "../../_shared/login_url_codec";
import { sendToAttached } from "../../_shared/send_to_attached";
import { StatusScreen } from "../../_shared/status_screen";
import { useAttachedInit } from "../../_shared/use_attached_init";

export function LoginCompleteClient({
  iframeRef,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
}) {
  const [status, setStatus] = useState("Completing sign-in...");

  // Parse OAuth params from query string
  const oauthParams = useMemo(() => {
    const params: Record<string, string> = {};
    for (const [key, value] of new URLSearchParams(window.location.search)) {
      params[key] = value;
    }
    return params;
  }, []);

  // Session data read from sessionStorage on mount
  const sessionDataRef = useRef<{
    redirectScheme: string;
    oauthPayload: Record<string, string>;
  } | null>(null);

  // Read session data and validate OAuth payload on mount
  useEffect(() => {
    const redirectScheme =
      oauthParams.redirect_scheme ||
      sessionStorage.getItem("oko_mobile_redirect_scheme") ||
      "";
    const apiKey =
      oauthParams.api_key || sessionStorage.getItem("oko_mobile_api_key") || "";

    if (!redirectScheme) {
      setStatus("Error: missing redirect scheme. Please try again.");
      console.error(
        "[oko-mobile-login-complete] missing redirect_scheme for callback",
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

    sessionDataRef.current = { redirectScheme, oauthPayload };
    sessionStorage.removeItem("oko_mobile_redirect_scheme");
    sessionStorage.removeItem("oko_mobile_api_key");
    sessionStorage.removeItem("oko_mobile_client_random");
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

    void handlePostInit(payload);
  });

  async function handlePostInit(
    payload: Parameters<Parameters<typeof useAttachedInit>[0]>[0],
  ) {
    if (!sessionDataRef.current) {
      return;
    }

    setStatus("Processing sign-in...");

    // NOTE: Do NOT call sign_out here to clear stale sessions.
    // sign_out runs resetAll() which also clears the nonce/codeVerifier
    // that was stored by generate_oauth_url on the /mobile/login page.
    // oauth_info_pass needs these to verify the OAuth token.
    // The new sign-in will overwrite stale wallet data anyway.
    if (payload?.data?.public_key) {
      console.info(
        "[oko-mobile-login-complete] existing session found, will be overwritten by new sign-in",
      );
    }

    // Inject nonce for email login (generated in /mobile/login, not in attached)
    const emailNonce = sessionStorage.getItem("oko_mobile_email_nonce");
    if (emailNonce && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          target: "oko_attached",
          msg_type: "set_reauth_params",
          payload: { nonce: emailNonce },
        },
        ATTACHED_ORIGIN,
      );
      sessionStorage.removeItem("oko_mobile_email_nonce");
    }

    // Send OAuth tokens to attached for keygen
    sendToAttached<OkoWalletMsgOAuthInfoPassAck>(iframeRef.current!, {
      target: "oko_attached",
      msg_type: "oauth_info_pass",
      payload: sessionDataRef.current.oauthPayload,
    }).then((ack) => {
      console.log("[oko-mobile-login-complete] oauth_info_pass_ack:", ack);
    });
  }

  const handleKeygenComplete = useCallback(async () => {
    try {
      setStatus("Finalizing...");

      // Request wallet info from attached iframe via postMessage (cross-origin)
      const walletData = await fetchWalletInfoFromAttached(iframeRef.current!);
      if (!walletData) {
        throw new Error("Wallet data not available from attached iframe");
      }

      const redirectScheme = sessionDataRef.current?.redirectScheme;
      if (redirectScheme) {
        const query = new URLSearchParams();
        const { encoded, stats } =
          encodeLoginResultPayloadWithStats(walletData);
        query.set(LOGIN_URL_VERSION_PARAM, LOGIN_URL_CODEC_VERSION);
        query.set(LOGIN_URL_RESULT_PARAM, encoded);
        const callbackUrl = `${redirectScheme}://?${query.toString()}`;
        console.info("[oko-mobile-login-size] result", {
          authType: walletData.authType,
          jsonBytes: stats.jsonBytes,
          compressedBytes: stats.compressedBytes,
          encodedChars: stats.encodedChars,
          callbackUrlChars: callbackUrl.length,
        });
        window.location.replace(callbackUrl);
        return;
      }

      throw new Error("Missing redirect scheme");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`Error: ${message}`);
      console.error("[oko-mobile-login-complete] error:", err);
    }
  }, [iframeRef]);

  // Listen for oauth_sign_in_update (keygen complete — separate from init)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== ATTACHED_ORIGIN) {
        return;
      }
      const msg = event.data;
      if (!msg || typeof msg !== "object") {
        return;
      }

      if (msg.msg_type === "oauth_sign_in_update") {
        const update = msg as OkoWalletMsgOAuthSignInUpdate;
        event.ports?.[0]?.postMessage({
          target: "oko_attached",
          msg_type: "oauth_sign_in_update_ack",
          payload: null,
        });

        if (!update.payload.success) {
          const error = formatOAuthSignInError(update.payload.err);
          setStatus(`Error: ${error}`);
          console.error(
            "[oko-mobile-login-complete] oauth_sign_in_update failed:",
            update.payload.err,
          );
          return;
        }

        setStatus("Securing wallet...");
        handleKeygenComplete();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleKeygenComplete]);

  return (
    <StatusScreen
      title={status}
      tone={status.startsWith("Error:") ? "error" : "default"}
    />
  );
}

async function fetchWalletInfoFromAttached(
  iframe: HTMLIFrameElement,
): Promise<LoginWalletInfo | null> {
  try {
    const ack = await sendToAttached<OkoWalletMsgGetWalletInfoAck>(iframe, {
      target: "oko_attached",
      msg_type: "get_wallet_info",
      payload: null,
    });

    if (!ack.payload?.success || !ack.payload.data) {
      return null;
    }

    const { authType, publicKey, email, name } = ack.payload.data;
    if (typeof authType !== "string" || typeof publicKey !== "string") {
      return null;
    }

    let publicKeyEd25519: string | null = null;
    try {
      const ed25519Ack = await sendToAttached<{
        payload?: { success: boolean; data?: string };
      }>(iframe, {
        target: "oko_attached",
        msg_type: "get_public_key_ed25519",
        payload: null,
      });
      if (ed25519Ack.payload?.success && ed25519Ack.payload.data) {
        publicKeyEd25519 = ed25519Ack.payload.data;
      }
    } catch {
      // Ed25519 key may not exist — non-critical
    }

    return {
      authType,
      publicKey,
      publicKeyEd25519,
      email: email ?? null,
      name: name ?? null,
    };
  } catch (e) {
    console.error(
      "[oko-mobile-login-complete] failed to get wallet info from attached:",
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
  if (!apiKey) {
    return null;
  }

  const base: Record<string, string> = {
    provider,
    api_key: apiKey,
    target_origin: window.location.origin,
    auth_type: params.auth_type || provider,
  };

  if (params.access_token || params.id_token) {
    base.access_token = params.access_token || "";
    base.id_token = params.id_token || "";
    return base;
  }

  if (params.code) {
    base.code = params.code;
    return base;
  }

  return null;
}

function formatOAuthSignInError(err: unknown): string {
  if (!err || typeof err !== "object") {
    return "OAuth sign-in failed";
  }

  const type =
    "type" in err && typeof err.type === "string" ? err.type : "unknown";

  if (type === "signup_disabled") {
    return "New signups are disabled as the service is winding down.";
  }

  const detail =
    "error" in err && typeof err.error === "string" ? err.error : null;

  return detail ? `${type}: ${detail}` : type;
}
