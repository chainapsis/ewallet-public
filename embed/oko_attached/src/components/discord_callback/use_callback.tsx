import { useEffect, useState } from "react";
import type { Result } from "@oko-wallet/stdlib-js";
import {
  RedirectUriSearchParamsKey,
  type OAuthTokenRequestPayload,
} from "@oko-wallet/oko-sdk-core";

import type { HandleDiscordCallbackError } from "./types";
import { postLog } from "@oko-wallet-attached/requests/logging";
import { errorToLog } from "@oko-wallet-attached/logging/error";
import { sendOAuthPayloadToEmbeddedWindow } from "@oko-wallet-attached/components/oauth_callback/send_oauth_payload";

export function useDiscordCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fn() {
      try {
        const cbRes = await handleDiscordCallback();

        if (cbRes.success) {
          const stateParam = new URLSearchParams(window.location.search).get("state");
          if (stateParam) {
            try {
              const oauthState = JSON.parse(atob(stateParam));
              if (oauthState.apiKey === "export_key_reauth") {
                window.close();
                return;
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
          message: "Discord callback error",
          error: errorToLog(err),
        });

        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    fn().then();
  }, []);

  return { error };
}

export async function handleDiscordCallback(): Promise<
  Result<void, HandleDiscordCallbackError>
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

  console.log("[discord callback] code: %s, stateParam: %s", code, stateParam);

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
    auth_type: "discord",
  };

  const sendRes = await sendOAuthPayloadToEmbeddedWindow(payload);

  if (!sendRes.success) {
    console.error("[attached] send oauth result fail, err: %o", sendRes.err);
    return sendRes;
  }

  return { success: true, data: void 0 };
}
