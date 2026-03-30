"use client";

import { Logo } from "@oko-wallet/oko-common-ui/logo";
import { ThemeContext } from "@oko-wallet/oko-common-ui/theme";
import type { OAuthState } from "@oko-wallet/oko-sdk-core";
import { RedirectUriSearchParamsKey } from "@oko-wallet/oko-sdk-core";
import { type FC, useContext, useEffect } from "react";

import telegramStyles from "./telegram_login_popup.module.scss";
import { createPkcePair } from "@oko-wallet-attached/config/oauth";
import {
  TELEGRAM_CLIENT_ID,
  TELEGRAM_OIDC_AUTH_URL,
} from "@oko-wallet-attached/config/telegram";
import { useAppState } from "@oko-wallet-attached/store/app";

export const TelegramLoginPopup: FC = () => {
  const theme = useContext(ThemeContext);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    const stateParam = urlParams.get(RedirectUriSearchParamsKey.STATE);

    if (!stateParam) {
      return;
    }

    let oauthState: OAuthState;
    try {
      oauthState = JSON.parse(stateParam) as OAuthState;
    } catch (_err) {
      return;
    }

    (async () => {
      const { codeVerifier, codeChallenge } = await createPkcePair();

      const storageKey = oauthState.targetOrigin || window.location.origin;
      const appState = useAppState.getState();
      appState.setCodeVerifier(storageKey, codeVerifier);
      appState.setOauthRedirectOrigin(storageKey, window.location.origin);

      const redirectUri = `${window.location.origin}/telegram/callback`;

      const authUrl = new URL(TELEGRAM_OIDC_AUTH_URL);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", TELEGRAM_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", "openid");
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("state", btoa(JSON.stringify(oauthState)));

      window.location.href = authUrl.toString();
    })();
  }, []);

  return (
    <div className={telegramStyles.container}>
      <div className={telegramStyles.body}>
        <div className={telegramStyles.popupContainer}>
          <div className={telegramStyles.card}>
            <div className={telegramStyles.cardTop}>
              <Logo theme={theme} />
              <div className={telegramStyles.continueText}>
                Continue with Telegram
              </div>
            </div>
            <div className={telegramStyles.telegramWidgetContainer}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "16px",
                }}
              >
                Redirecting to Telegram...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
