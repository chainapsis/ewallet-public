import { useContext, useEffect, useMemo, useState } from "react";

import type { OAuthState } from "@oko-wallet/oko-sdk-core";
import { RedirectUriSearchParamsKey } from "@oko-wallet/oko-sdk-core";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { Button } from "@oko-wallet/oko-common-ui/button";
import { WarningIcon } from "@oko-wallet/oko-common-ui/icons/warning_icon";
import { Logo } from "@oko-wallet/oko-common-ui/logo";
import { ThemeContext } from "@oko-wallet/oko-common-ui/theme";

import { TELEGRAM_BOT_NAME } from "@oko-wallet-attached/config/telegram";

import {
  findEmbeddedIframe,
  sendReauthParamsToIframe,
} from "./use_export_reauth";
import styles from "./telegram_reauth.module.scss";

const LOG_PREFIX = "[attached][telegram_reauth]";

export const TelegramReauth = () => {
  const theme = useContext(ThemeContext);
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
      <div className={styles.container}>
        <div className={styles.body}>
          <div className={styles.popupContainer}>
            <div className={styles.errorContainer}>
              <div className={styles.errorTopSection}>
                <div className={styles.errorIconWrapper}>
                  <WarningIcon size={42} />
                </div>
                <Typography
                  tagType="h1"
                  className={styles.errorTitle}
                  color="primary"
                  size="lg"
                >
                  Request failed
                </Typography>
                <div className={styles.errorMessageBox}>
                  <div className={styles.errorTextRow}>
                    <Typography
                      size="sm"
                      weight="semibold"
                      className={styles.errorMessageText}
                    >
                      {errorMessage}
                    </Typography>
                  </div>
                </div>
                <Typography
                  tagType="a"
                  href="https://okowallet.userjot.com/board/report-bugs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.errorSupportLink}
                  size="xs"
                  weight="medium"
                >
                  Get Support
                </Typography>
              </div>
              <div className={styles.errorBottomSection}>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => window.close()}
                  fullWidth
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.body}>
        <div className={styles.popupContainer}>
          <div className={styles.card}>
            <div className={styles.stepIndicator}>
              <div className={styles.stepProgressBar}>
                <div className={styles.stepNumberActive}>1</div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="30"
                  height="2"
                  viewBox="0 0 30 2"
                  fill="none"
                  className={styles.stepLine}
                >
                  <path
                    d="M0.614014 0.614258H28.614"
                    stroke="var(--colors-text-text-primary-900, #181D27)"
                    strokeWidth="1.22807"
                    strokeLinecap="round"
                  />
                </svg>
                <div className={styles.stepNumberInactive}>2</div>
              </div>
              <div className={styles.stepText}>Step 1/2</div>
            </div>
            <div className={styles.cardTop}>
              <Logo theme={theme} />
              <div className={styles.continueText}>Continue with Telegram</div>
            </div>
            <div className={styles.telegramWidgetContainer}>
              <div
                id="telegram-reauth-container"
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
}
