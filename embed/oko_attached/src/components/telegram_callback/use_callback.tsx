import {
  type OAuthTokenRequestPayload,
  RedirectUriSearchParamsKey,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";
import { useEffect, useState } from "react";

import type { HandleTelegramCallbackError } from "./types";
import { handleMobileRedirect } from "@oko-wallet-attached/components/oauth_callback/handle_mobile_redirect";
import { sendOAuthPayloadToEmbeddedWindow } from "@oko-wallet-attached/components/oauth_callback/send_oauth_payload";
import { errorToLog } from "@oko-wallet-attached/logging/error";
import { postLog } from "@oko-wallet-attached/requests/logging";

export function useTelegramCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fn() {
      try {
        const cbRes = await handleTelegramCallback();

        if (cbRes.success) {
          const stateParam = new URLSearchParams(window.location.search).get(
            "state",
          );
          if (stateParam) {
            try {
              const oauthState = JSON.parse(atob(stateParam));
              if (oauthState.apiKey === "export_key_reauth") {
                window.close();
                return;
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
          message: "Telegram callback error",
          error: errorToLog(err),
        });

        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    fn().then();
  }, []);

  return { error };
}

export async function handleTelegramCallback(): Promise<
  Result<void, HandleTelegramCallbackError>
> {
  const urlParams = new URLSearchParams(window.location.search);

  // Telegram OIDC sends error param on denial
  if (urlParams.get("error")) {
    return {
      success: false,
      err: { type: "login_canceled_by_user" },
    };
  }

  const code = urlParams.get("code");
  const stateParam = urlParams.get(RedirectUriSearchParamsKey.STATE) || "{}";

  // Mobile: OS-browser flow or sessionStorage fallback
  if (stateParam !== "{}") {
    try {
      const oauthState = JSON.parse(atob(stateParam));
      const mobileRedirected = handleMobileRedirect({
        provider: "telegram",
        authType: "telegram",
        oauthState,
        code,
      });
      if (mobileRedirected) {
        return { success: true, data: void 0 };
      }
    } catch {
      /* fall through to web flow */
    }
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
    code,
    api_key: apiKey,
    target_origin: targetOrigin,
    auth_type: "telegram",
  };

  const sendRes = await sendOAuthPayloadToEmbeddedWindow(payload);

  if (!sendRes.success) {
    console.error("[attached] send oauth result fail, err: %o", sendRes.err);
    return sendRes;
  }

  return { success: true, data: void 0 };
}
