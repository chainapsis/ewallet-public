import { useEffect, useState } from "react";
import type { Result } from "@oko-wallet/stdlib-js";
import {
  RedirectUriSearchParamsKey,
  type OAuthTokenRequestPayload,
} from "@oko-wallet/oko-sdk-core";

import type { HandleGithubCallbackError } from "./types";
import { postLog } from "@oko-wallet-attached/requests/logging";
import { errorToLog } from "@oko-wallet-attached/logging/error";
import { sendOAuthPayloadToEmbeddedWindow } from "@oko-wallet-attached/components/oauth_callback/send_oauth_payload";

export function useGithubCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fn() {
      try {
        const cbRes = await handleGithubCallback();

        if (cbRes.success) {
          const stateParam = new URLSearchParams(window.location.search).get("state");
          if (stateParam) {
            try {
              const oauthState = JSON.parse(atob(stateParam));
              if (oauthState.apiKey === "export_key_reauth") {
                return; // Parent will close popup when iframes are ready
              }
            } catch { /* ignore parse errors */ }
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
  if (!window.opener) {
    return {
      success: false,
      err: {
        type: "opener_window_not_exists",
      },
    };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const stateParam = urlParams.get(RedirectUriSearchParamsKey.STATE) || "{}";

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
