"use client";

import { Logo } from "@oko-wallet/oko-common-ui/logo";
import { ThemeContext } from "@oko-wallet/oko-common-ui/theme";
import { RedirectUriSearchParamsKey } from "@oko-wallet/oko-sdk-core";
import { type FC, useContext, useEffect } from "react";

import telegramStyles from "./telegram_login_popup.module.scss";
import { TELEGRAM_BOT_NAME } from "@oko-wallet-attached/config/telegram";
import { useAppState } from "@oko-wallet-attached/store/app";

export const TelegramLoginPopup: FC = () => {
  const theme = useContext(ThemeContext);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    const stateParam = urlParams.get(RedirectUriSearchParamsKey.STATE);
    const modalId = urlParams.get("modal_id");
    const hostOrigin = urlParams.get("host_origin");

    if (!stateParam) {
      return;
    }

    try {
      JSON.parse(stateParam);
    } catch (_err) {
      return;
    }

    const cleanBotName = TELEGRAM_BOT_NAME.replace(/^@+/, "").trim();

    const callbackUrl = new URL(`${window.location.origin}/telegram/callback`);
    callbackUrl.searchParams.set(RedirectUriSearchParamsKey.STATE, stateParam);
    if (modalId) {
      callbackUrl.searchParams.set("modal_id", modalId);
    }
    if (hostOrigin) {
      callbackUrl.searchParams.set("host_origin", hostOrigin);
    }

    const currentTheme =
      (hostOrigin && useAppState.getState().getTheme(hostOrigin)) ??
      urlParams.get("theme");
    if (currentTheme) {
      callbackUrl.searchParams.set("theme", currentTheme);
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", cleanBotName);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-auth-url", callbackUrl.toString());
    script.setAttribute("data-request-access", "write");
    script.async = true;

    const container = document.getElementById("telegram-login-container");
    if (container) {
      container.appendChild(script);
    }

    return () => {
      if (container?.contains(script)) {
        container.removeChild(script);
      }
    };
  }, []);

  return (
    <div className={telegramStyles.container}>
      <div className={telegramStyles.body}>
        <div className={telegramStyles.popupContainer}>
          <div className={telegramStyles.card}>
            <div className={telegramStyles.stepIndicator}>
              <div className={telegramStyles.stepProgressBar}>
                <div className={telegramStyles.stepNumberActive}>1</div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="30"
                  height="2"
                  viewBox="0 0 30 2"
                  fill="none"
                  className={telegramStyles.stepLine}
                >
                  <path
                    d="M0.614014 0.614258H28.614"
                    stroke="var(--colors-text-text-primary-900, #181D27)"
                    strokeWidth="1.22807"
                    strokeLinecap="round"
                  />
                </svg>
                <div className={telegramStyles.stepNumberInactive}>2</div>
              </div>
              <div className={telegramStyles.stepText}>Step 1/2</div>
            </div>
            <div className={telegramStyles.cardTop}>
              <Logo theme={theme} />
              <div className={telegramStyles.continueText}>
                Continue with Telegram
              </div>
            </div>
            <div className={telegramStyles.telegramWidgetContainer}>
              <div
                id="telegram-login-container"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
