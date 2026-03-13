import type { OAuthPayload } from "@oko-wallet/oko-sdk-core";
import { RedirectUriSearchParamsKey } from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";
import { useEffect, useState } from "react";

import type { HandleCallbackError } from "./types";
import { handleMobileRedirect } from "@oko-wallet-attached/components/oauth_callback/handle_mobile_redirect";
import { sendOAuthPayloadToEmbeddedWindow } from "@oko-wallet-attached/components/oauth_callback/send_oauth_payload";
import { errorToLog } from "@oko-wallet-attached/logging/error";
import { postLog } from "@oko-wallet-attached/requests/logging";

export function useGoogleCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fn() {
      try {
        const cbRes = await handleGoogleCallback();

        if (cbRes.success) {
          const oauthState = getOAuthStateFromUrl();
          if (oauthState.apiKey === "export_key_reauth") {
            window.close();
            return;
          }
          window.close();
        } else {
          setError(cbRes.err.type);
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

  // Mobile: OS-browser flow or sessionStorage fallback
  const mobileRedirected = handleMobileRedirect({
    provider: "google",
    authType: "google",
    oauthState,
    access_token: accessToken,
    id_token: idToken,
  });
  if (mobileRedirected) {
    return { success: true, data: void 0 };
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
