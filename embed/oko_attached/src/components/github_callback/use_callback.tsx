import {
  type OAuthTokenRequestPayload,
  RedirectUriSearchParamsKey,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";
import { useEffect, useState } from "react";

import type { HandleGithubCallbackError } from "./types";
import { sendOAuthPayloadToEmbeddedWindow } from "@oko-wallet-attached/components/oauth_callback/send_oauth_payload";
import { storeOAuthRelay } from "@oko-wallet-attached/components/oauth_callback/store_oauth_relay";
import { redirectToRnLoginComplete } from "@oko-wallet-attached/components/oauth_callback/redirect_to_rn_login_complete";
import { tryRnOsBrowserRedirect } from "@oko-wallet-attached/components/oauth_callback/try_rn_os_browser_redirect";
import { errorToLog } from "@oko-wallet-attached/logging/error";
import { postLog } from "@oko-wallet-attached/requests/logging";

export function useGithubCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fn() {
      try {
        const cbRes = await handleGithubCallback();

        if (cbRes.success) {
          const stateParam = new URLSearchParams(window.location.search).get(
            "state",
          );
          if (stateParam) {
            try {
              const oauthState = JSON.parse(atob(stateParam));
              if (oauthState.apiKey === "export_key_reauth") {
                return; // Parent will close popup when iframes are ready
              }
            } catch {
              /* ignore parse errors */
            }
          }
          window.close();
        } else {
          if (cbRes.err.type === "login_canceled_by_user") {
            window.close();
          }
          setError(cbRes.err.type);
        }
      } catch (err) {
        postLog({
          level: "error",
          message: "GitHub callback error",
          error: errorToLog(err),
        });

        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    fn().then();
  }, []);

  return { error };
}

export async function handleGithubCallback(): Promise<
  Result<void, HandleGithubCallbackError>
> {
  const urlParams = new URLSearchParams(window.location.search);

  // GitHub sends error param on denial (e.g. access_denied).
  // Check before window.opener — error redirect may land on a different
  // origin when multiple callback URLs are registered.
  if (urlParams.get("error")) {
    return {
      success: false,
      err: { type: "login_canceled_by_user" },
    };
  }

  const code = urlParams.get("code");
  const stateParam = urlParams.get(RedirectUriSearchParamsKey.STATE) || "{}";

  // RN OS-browser: redirect to login/complete page for keygen inside the browser
  if (!window.opener && stateParam !== "{}") {
    try {
      const oauthState = JSON.parse(atob(stateParam));
      if (oauthState.rnOsBrowser && code) {
        redirectToRnLoginComplete({
          provider: "github",
          api_key: oauthState.apiKey,
          target_origin: oauthState.targetOrigin,
          auth_type: "github",
          code,
        });
        return { success: true, data: void 0 };
      }
    } catch { /* fall through */ }
  }

  // React Native (legacy relay): store tokens server-side and deep link with relay code only
  if (!window.opener && stateParam !== "{}") {
    try {
      const oauthState = JSON.parse(atob(stateParam));
      if (oauthState.redirectScheme && code) {
        const relayCode = await storeOAuthRelay({
          code,
          api_key: oauthState.apiKey,
          target_origin: oauthState.targetOrigin,
          auth_type: "github",
        });
        window.location.href = `${oauthState.redirectScheme}://oauth-callback?relay_code=${relayCode}`;
        return { success: true, data: void 0 };
      }
    } catch { /* fall through to normal error */ }
  }

  // Fallback: check sessionStorage set by /rn/login page
  if (!window.opener) {
    if (code) {
      const redirected = tryRnOsBrowserRedirect({
        provider: "github",
        auth_type: "github",
        code,
      });
      if (redirected) return { success: true, data: void 0 };
    }

    return {
      success: false,
      err: {
        type: "opener_window_not_exists",
      },
    };
  }

  if (!code) {
    return {
      success: false,
      err: { type: "login_canceled_by_user" },
    };
  }

  if (!stateParam) {
    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  const oauthState = JSON.parse(atob(stateParam));
  const apiKey: string = oauthState.apiKey;
  const targetOrigin: string = oauthState.targetOrigin;

  if (!apiKey || !targetOrigin) {
    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  const payload: OAuthTokenRequestPayload = {
    code: code,
    api_key: apiKey,
    target_origin: targetOrigin,
    auth_type: "github",
  };

  const sendRes = await sendOAuthPayloadToEmbeddedWindow(payload);

  if (!sendRes.success) {
    console.error("[attached] send oauth result fail, err: %o", sendRes.err);
    return sendRes;
  }

  return { success: true, data: void 0 };
}
