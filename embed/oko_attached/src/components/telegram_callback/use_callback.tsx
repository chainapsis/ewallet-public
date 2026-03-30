import {
  type OAuthState,
  RedirectUriSearchParamsKey,
  type TelegramLoginModalApproveAckPayload,
  type TelegramLoginModalErrorAckPayload,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";
import { useEffect, useState } from "react";

import type { HandleTelegramCallbackError } from "./types";
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
            RedirectUriSearchParamsKey.STATE,
          );
          if (stateParam) {
            try {
              const oauthState = JSON.parse(stateParam);
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
  const stateParam = urlParams.get(RedirectUriSearchParamsKey.STATE) || "{}";
  const modalIdFromQuery = urlParams.get("modal_id");
  const hostOriginFromQuery = urlParams.get("host_origin");

  if (!stateParam) {
    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  let oauthState: OAuthState;
  try {
    oauthState = JSON.parse(stateParam) as OAuthState;
  } catch (_err) {
    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  const apiKey: string = oauthState.apiKey;
  const targetOrigin: string = oauthState.targetOrigin;

  if (!apiKey || !targetOrigin) {
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
    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  const telegramData: Record<string, string> = {};
  const excludedParams = [
    RedirectUriSearchParamsKey.STATE,
    "modal_id",
    "host_origin",
    "theme",
  ];
  for (const [key, value] of urlParams.entries()) {
    if (!excludedParams.includes(key) && value !== null) {
      telegramData[key] = value;
    }
  }

  if (!telegramData.id || !telegramData.auth_date || !telegramData.hash) {
    return {
      success: false,
      err: { type: "params_not_sufficient" },
    };
  }

  const payload = {
    telegram_data: {
      ...telegramData,
    },
    api_key: apiKey,
    target_origin: targetOrigin,
    auth_type: "telegram" as const,
  };

  const sendRes = await sendOAuthPayloadToEmbeddedWindow(payload);

  if (!sendRes.success) {
    console.error(
      "[attached] send telegram oauth result fail, err: %o",
      sendRes.err,
    );
    const message =
      "error" in sendRes.err
        ? `${sendRes.err.type}: ${sendRes.err.error}`
        : sendRes.err.type;
    sendAckToSDK(oauthState, {
      modal_type: "auth/telegram_login",
      modal_id: oauthState.modalId!,
      type: "error",
      error: {
        type: "unknown_error",
        error: message,
      },
    });
    return sendRes;
  }

  sendAckToSDK(oauthState, {
    modal_type: "auth/telegram_login",
    modal_id: oauthState.modalId!,
    type: "approve",
    data: {},
  });

  return { success: true, data: void 0 };
}

function sendAckToSDK(
  oauthState: OAuthState,
  payload:
    | TelegramLoginModalApproveAckPayload
    | TelegramLoginModalErrorAckPayload,
) {
  if (!window.opener || !oauthState.targetOrigin) {
    return;
  }

  window.opener.postMessage(
    {
      target: "oko_sdk",
      msg_type: "open_modal_ack",
      payload,
    },
    oauthState.targetOrigin,
  );
}
