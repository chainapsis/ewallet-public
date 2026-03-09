import { useEffect, useState } from "react";
import type { Result } from "@oko-wallet/stdlib-js";
import type { OAuthPayload } from "@oko-wallet/oko-sdk-core";
import { RedirectUriSearchParamsKey } from "@oko-wallet/oko-sdk-core";

import type { HandleCallbackError } from "./types";
import { postLog } from "@oko-wallet-attached/requests/logging";
import { errorToLog } from "@oko-wallet-attached/logging/error";
import { sendOAuthPayloadToEmbeddedWindow } from "@oko-wallet-attached/components/oauth_callback/send_oauth_payload";
import { storeOAuthRelay } from "@oko-wallet-attached/components/oauth_callback/store_oauth_relay";
import { redirectToMobileLoginComplete } from "@oko-wallet-attached/components/oauth_callback/redirect_to_mobile_login_complete";
import { tryMobileOsBrowserRedirect } from "@oko-wallet-attached/components/oauth_callback/try_mobile_os_browser_redirect";

export function useGoogleCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fn() {
      try {
        const cbRes = await handleGoogleCallback();

        if (cbRes.success) {
          const oauthState = getOAuthStateFromUrl();
          if (oauthState.apiKey === "export_key_reauth") {
            return; // Parent will close popup when iframes are ready
          }
          window.close();
        }
      } catch (err) {
        postLog({
          level: "error",
          message: "Google callback error",
          error: errorToLog(err),
        });

        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    fn().then();
  }, []);

  return { error };
}

export async function handleGoogleCallback(): Promise<
  Result<void, HandleCallbackError>
> {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = params.get("access_token");
  const idToken = params.get("id_token");

  const oauthState = getOAuthStateFromUrl();

  // Mobile OS-browser: redirect to login/complete page for keygen inside the browser
  if (!window.opener && oauthState.mobileOsBrowser) {
    redirectToMobileLoginComplete({
      provider: "google",
      api_key: oauthState.apiKey,
      target_origin: oauthState.targetOrigin,
      auth_type: "google",
      access_token: accessToken,
      id_token: idToken,
    });
    return { success: true, data: void 0 };
  }

  // Mobile (legacy relay): store tokens server-side and deep link with relay code only
  if (!window.opener && oauthState.redirectScheme) {
    const relayCode = await storeOAuthRelay({
      access_token: accessToken,
      id_token: idToken,
      api_key: oauthState.apiKey,
      target_origin: oauthState.targetOrigin,
      auth_type: "google",
    });
    window.location.href = `${oauthState.redirectScheme}://oauth-callback?relay_code=${relayCode}`;
    return { success: true, data: void 0 };
  }

  // Fallback: check sessionStorage set by /mobile/login page
  if (!window.opener) {
    const redirected = tryMobileOsBrowserRedirect({
      provider: "google",
      auth_type: "google",
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

  const apiKey: string = oauthState.apiKey;
  const targetOrigin: string = oauthState.targetOrigin;

  if (accessToken && idToken && targetOrigin && apiKey) {
    const payload: OAuthPayload = {
      access_token: accessToken,
      id_token: idToken,
      api_key: apiKey,
      target_origin: targetOrigin,
      auth_type: oauthState.provider,
    };

    const sendRes = await sendOAuthPayloadToEmbeddedWindow(payload);

    if (!sendRes.success) {
      console.error("[attached] send oauth result fail, err: %o", sendRes.err);
      return sendRes;
    }
  } else {
    console.error("[attached] Params not sufficient");

    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  return { success: true, data: void 0 };
}

export function getOAuthStateFromUrl() {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const oauthState = JSON.parse(
    params.get(RedirectUriSearchParamsKey.STATE) || "{}",
  );
  return oauthState;
}
