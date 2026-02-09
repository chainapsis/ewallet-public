"use client";

import { useEffect, useState, type FC } from "react";
import { LoadingCircleIcon } from "@oko-wallet/oko-common-ui/icons/loading_circle_icon";
import { WarningIcon } from "@oko-wallet/oko-common-ui/icons/warning_icon";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { Theme } from "@oko-wallet/oko-common-ui/theme";

import telegramStyles from "@oko-wallet-attached/components/telegram/telegram_login_popup.module.scss";
import { getSystemTheme } from "@oko-wallet-attached/components/google_callback/theme";
import { setColorScheme } from "@oko-wallet-attached/components/attached_initialized/color_scheme";
import { useTelegramCallback } from "./use_callback";

export const TelegramCallback: FC = () => {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const theme = getSystemTheme();
    setColorScheme(theme);
    setTheme(theme);
  }, []);

  const { error } = useTelegramCallback();

  if (error) {
    return (
      <div className={telegramStyles.container}>
        <div className={telegramStyles.body}>
          <ErrorMessage error={error} />
        </div>
      </div>
    );
  }

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
                <div className={telegramStyles.stepNumberActive}>2</div>
              </div>
              <div className={telegramStyles.stepText}>Step 2/2</div>
            </div>
            <div className={telegramStyles.loadingContainer}>
              <LoadingCircleIcon size={62} />
              <div className={telegramStyles.signingText}>Signing in...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ErrorMessage: FC<{ error: string }> = ({ error }) => {
  const handleClose = () => {
    window.close();
  };

  const errorCode = error || "unknown_error";
  const isParamsNotSufficient = errorCode === "params_not_sufficient";

  return (
    <div className={telegramStyles.errorContainer}>
      <div className={telegramStyles.errorTopSection}>
        <div className={telegramStyles.errorIconWrapper}>
          <WarningIcon size={42} />
        </div>
        <Typography
          tagType="h1"
          className={telegramStyles.errorTitle}
          color="primary"
          size="lg"
        >
          Request failed
        </Typography>
        <div className={telegramStyles.errorMessageBox}>
          <div className={telegramStyles.errorTextRow}>
            <Typography
              size="sm"
              weight="semibold"
              className={telegramStyles.errorMessageText}
            >
              Error Code: {errorCode}
            </Typography>
          </div>
          {isParamsNotSufficient && (
            <div className={telegramStyles.errorTextRow}>
              <Typography
                size="sm"
                weight="semibold"
                className={telegramStyles.errorMessageText}
              >
                Failed to get the required information from Telegram. Please
                contact Oko for support.
              </Typography>
            </div>
          )}
        </div>
        <Typography
          tagType="a"
          href="https://okowallet.userjot.com/board/report-bugs"
          target="_blank"
          rel="noopener noreferrer"
          className={telegramStyles.errorSupportLink}
          size="xs"
          weight="medium"
        >
          Get Support
        </Typography>
      </div>
      <div className={telegramStyles.errorBottomSection}>
        <button
          className={telegramStyles.errorCloseButton}
          onClick={handleClose}
        >
          <span>Close</span>
        </button>
      </div>
    </div>
  );
};
