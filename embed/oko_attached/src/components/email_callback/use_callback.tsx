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
import { storeOAuthRelay } from "@oko-wallet-attached/components/oauth_callback/store_oauth_relay";
import { redirectToMobileLoginComplete } from "@oko-wallet-attached/components/oauth_callback/redirect_to_mobile_login_complete";
import { tryMobileOsBrowserRedirect } from "@oko-wallet-attached/components/oauth_callback/try_mobile_os_browser_redirect";

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
  // Mobile: no opener, parse hash manually — auth0-js's parseHash validates
  // state against its internal transaction store, but the mobile flow bypasses auth0-js
  // (redirects to Auth0's Universal Login directly) so no transaction was stored.
  if (!window.opener) {
    const { accessToken, idToken, state: stateString } = parseHashParams();
    if (stateString && (accessToken || idToken)) {
      try {
        const oauthState = JSON.parse(stateString) as OAuthState;

        // Mobile OS-browser: redirect to login/complete page for keygen inside the browser
        if (oauthState.mobileOsBrowser) {
          redirectToMobileLoginComplete({
            provider: oauthState.provider ?? "auth0",
            api_key: oauthState.apiKey,
            target_origin: oauthState.targetOrigin,
            auth_type: oauthState.provider ?? "auth0",
            access_token: accessToken,
            id_token: idToken,
          });
          return { success: true, data: void 0 };
        }

        // Legacy relay: store tokens server-side and deep link with relay code
        if (oauthState.redirectScheme) {
          const relayCode = await storeOAuthRelay({
            access_token: accessToken,
            id_token: idToken,
            api_key: oauthState.apiKey,
            target_origin: oauthState.targetOrigin,
            auth_type: oauthState.provider ?? "auth0",
          });
          window.location.href = `${oauthState.redirectScheme}://oauth-callback?relay_code=${relayCode}`;
          return { success: true, data: void 0 };
        }
      } catch { /* fall through to normal error */ }
    }

    // Fallback: check sessionStorage set by /mobile/login page
    const redirected = tryMobileOsBrowserRedirect({
      provider: "auth0",
      auth_type: "auth0",
      access_token: accessToken,
      id_token: idToken,
    });
    if (redirected) return { success: true, data: void 0 };

    return {
      success: false,
      err: {
        type: "opener_window_not_exists",
      },
    };
  }
  // Web popup flow: auth0-js parseHash validates state properly
  const parsedHash = await parseAuth0Hash();

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

/**
 * Parse hash fragment manually (mobile flow).
 * Avoids auth0-js parseHash which requires a matching transaction in storage.
 */
function parseHashParams(): {
  accessToken: string | undefined;
  idToken: string | undefined;
  state: string | undefined;
} {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) {
    return { accessToken: undefined, idToken: undefined, state: undefined };
  }
  const params = new URLSearchParams(hash.substring(1));
  return {
    accessToken: params.get("access_token") ?? undefined,
    idToken: params.get("id_token") ?? undefined,
    state: params.get("state") ?? undefined,
  };
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
