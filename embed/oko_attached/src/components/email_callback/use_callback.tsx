"use client";

import { useEffect, useState } from "react";
import type { Result } from "@oko-wallet/stdlib-js";
import type {
  EmailLoginModalApproveAckPayload,
  EmailLoginModalErrorAckPayload,
  OAuthPayload,
  OAuthState,
} from "@oko-wallet/oko-sdk-core";
import type { Auth0DecodedHash } from "auth0-js";

import { getAuth0WebAuth } from "@oko-wallet-attached/config/auth0";
import type { HandleCallbackError } from "@oko-wallet-attached/components/google_callback/types";
import { sendOAuthPayloadToEmbeddedWindow } from "@oko-wallet-attached/components/oauth_callback/send_oauth_payload";

const EMAIL_STORAGE_KEY = "oko_email_login_pending_email";

export function useEmailCallback(): { error: string | null } {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fn() {
      try {
        // Read state before handleEmailCallback clears the hash via replaceState
        let isReauth = false;
        const hash = window.location.hash;
        if (hash) {
          try {
            const params = new URLSearchParams(hash.substring(1));
            const stateStr = params.get("state");
            if (stateStr) {
              const oauthState = JSON.parse(stateStr);
              if (oauthState.apiKey === "export_key_reauth") {
                isReauth = true;
              }
            }
          } catch { /* ignore parse errors */ }
        }

        const cbRes = await handleEmailCallback();

        if (cbRes.success) {
          if (isReauth) {
            return; // Parent will close popup when iframes are ready
          }
          window.close();
        } else {
          throw new Error(cbRes.err.type);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    fn().then();
  }, []);

  return { error };
}

export async function handleEmailCallback(): Promise<
  Result<void, HandleCallbackError>
> {
  const parsedHash = await parseAuth0Hash();

  // React Native: no opener, redirect OAuth result to deep link
  if (!window.opener) {
    const accessToken = parsedHash.accessToken;
    const idToken = parsedHash.idToken;
    const stateString = parsedHash.state;
    if (stateString && (accessToken || idToken)) {
      try {
        const oauthState = JSON.parse(stateString) as OAuthState;
        if (oauthState.redirectScheme) {
          const deepLinkParams = new URLSearchParams();
          deepLinkParams.set("provider", "auth0");
          if (accessToken) deepLinkParams.set("access_token", accessToken);
          if (idToken) deepLinkParams.set("id_token", idToken);
          window.location.href = `${oauthState.redirectScheme}://oauth-callback?${deepLinkParams.toString()}`;
          return { success: true, data: void 0 };
        }
      } catch { /* fall through to normal error */ }
    }

    return {
      success: false,
      err: {
        type: "opener_window_not_exists",
      },
    };
  }
  window.history.replaceState(
    {},
    document.title,
    window.location.pathname + window.location.search,
  );

  const accessToken = parsedHash.accessToken;
  const idToken = parsedHash.idToken;
  const stateString = parsedHash.state;

  const searchParams = new URLSearchParams(window.location.search);
  const modalIdFromQuery = searchParams.get("modal_id");
  const hostOriginFromQuery = searchParams.get("host_origin");

  if (!accessToken || !idToken || !stateString) {
    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  let oauthState: OAuthState;
  try {
    oauthState = JSON.parse(stateString) as OAuthState;
  } catch (error) {
    console.error("[attached] Failed to parse Auth0 state", error);
    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  if (!oauthState.apiKey || !oauthState.targetOrigin) {
    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  if (!oauthState.modalId && modalIdFromQuery) {
    oauthState.modalId = modalIdFromQuery;
  }
  if (!oauthState.targetOrigin && hostOriginFromQuery) {
    oauthState.targetOrigin = hostOriginFromQuery;
  }

  if (!oauthState.modalId) {
    console.error("[attached] Missing modalId for Auth0 callback");
    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  if (!oauthState.provider) {
    console.error("[attached] Missing provider for Auth0 callback");
    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  const payload: OAuthPayload = {
    access_token: accessToken,
    id_token: idToken,
    api_key: oauthState.apiKey,
    target_origin: oauthState.targetOrigin,
    auth_type: oauthState.provider as "auth0",
  };

  const email = consumePendingEmail() ?? "";
  const sendRes = await sendOAuthPayloadToEmbeddedWindow(payload);
  if (!sendRes.success) {
    const message =
      "error" in sendRes.err
        ? `${sendRes.err.type}: ${sendRes.err.error}`
        : sendRes.err.type;
    sendAckToSDK(oauthState, {
      modal_type: "auth/email_login",
      modal_id: oauthState.modalId!,
      type: "error",
      error: {
        type: "verification_failed",
        message,
      },
    });
    return sendRes;
  }

  sendAckToSDK(oauthState, {
    modal_type: "auth/email_login",
    modal_id: oauthState.modalId!,
    type: "approve",
    data: {
      email,
    },
  });
  return { success: true, data: void 0 };
}

async function parseAuth0Hash(): Promise<Auth0DecodedHash> {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) {
    throw new Error("Missing callback parameters.");
  }

  const webAuth = getAuth0WebAuth();

  return await new Promise<Auth0DecodedHash>((resolve, reject) => {
    webAuth.parseHash({ hash }, (err, result) => {
      if (err) {
        reject(
          new Error(
            err.error_description ??
              err.description ??
              err.errorDescription ??
              err.error ??
              "Auth0 callback error",
          ),
        );
        return;
      }

      if (!result || !result.idToken) {
        reject(new Error("Missing id_token in callback"));
        return;
      }

      resolve(result);
    });
  });
}

function sendAckToSDK(
  oauthState: OAuthState,
  payload: EmailLoginModalApproveAckPayload | EmailLoginModalErrorAckPayload,
) {
  window.opener!.postMessage(
    {
      target: "oko_sdk",
      msg_type: "open_modal_ack",
      payload,
    },
    oauthState.targetOrigin!,
  );
}

function consumePendingEmail(): string | null {
  try {
    const value = window.sessionStorage.getItem(EMAIL_STORAGE_KEY);
    if (value) {
      window.sessionStorage.removeItem(EMAIL_STORAGE_KEY);
      return value;
    }
  } catch {}
  return null;
}
