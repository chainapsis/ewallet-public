import { useEffect, useMemo, useState } from "react";

import type { OAuthState } from "@oko-wallet/oko-sdk-core";
import { RedirectUriSearchParamsKey } from "@oko-wallet/oko-sdk-core";

import { TELEGRAM_BOT_NAME } from "@oko-wallet-attached/config/telegram";

import {
  findEmbeddedIframe,
  sendReauthParamsToIframe,
} from "./use_export_reauth";

const LOG_PREFIX = "[attached][telegram_reauth]";

export function TelegramReauth() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Build OAuthState for the callback to parse
  const oauthState = useMemo<OAuthState>(
    () => ({
      apiKey: "reauth",
      targetOrigin: window.location.origin,
      provider: "telegram",
    }),
    [],
  );

  const oauthStateString = useMemo(
    () => JSON.stringify(oauthState),
    [oauthState],
  );

  useEffect(() => {
    // Send params to iframe (no nonce/PKCE needed for Telegram, but notify iframe)
    const iframe = findEmbeddedIframe();
    if (!iframe) {
      setErrorMessage(
        "Cannot find embedded iframe. Make sure this page was opened from the dashboard.",
      );
      return;
    }
    sendReauthParamsToIframe(iframe, {});

    const cleanBotName = TELEGRAM_BOT_NAME.replace(/^@+/, "").trim();

    const callbackUrl = new URL(`${window.location.origin}/telegram/callback`);
    callbackUrl.searchParams.set(
      RedirectUriSearchParamsKey.STATE,
      oauthStateString,
    );

    console.log(`${LOG_PREFIX} inserting telegram widget`, {
      botName: cleanBotName,
      callbackUrl: callbackUrl.toString(),
    });

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", cleanBotName);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-auth-url", callbackUrl.toString());
    script.setAttribute("data-request-access", "write");
    script.async = true;

    const container = document.getElementById("telegram-reauth-container");
    if (container) {
      container.appendChild(script);
    }

    return () => {
      if (container?.contains(script)) {
        container.removeChild(script);
      }
    };
  }, [oauthStateString]);

  if (errorMessage) {
    return (
      <div style={{ padding: "24px", maxWidth: "400px", margin: "0 auto" }}>
        <div style={{ color: "red" }}>{errorMessage}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "400px", margin: "0 auto" }}>
      <h3>Telegram Re-Authentication</h3>
      <p>Continue with Telegram to verify your identity.</p>
      <div
        id="telegram-reauth-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "16px",
        }}
      />
    </div>
  );
}
