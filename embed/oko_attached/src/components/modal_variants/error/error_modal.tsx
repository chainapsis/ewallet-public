import { Button } from "@oko-wallet/oko-common-ui/button";
import { ErrorIcon } from "@oko-wallet/oko-common-ui/icons/error_icon";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./error_modal.module.scss";
import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import { SignWithOkoBox } from "@oko-wallet-attached/components/sign_with_oko_box/sign_with_oko_box";
import type { AppError } from "@oko-wallet-attached/errors";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

function isAppErrorFn(error: unknown): error is AppError {
  return typeof error === "object" && error !== null && "type" in error;
}

function parseError(error: unknown): {
  errorCode: string;
  errorMessage: string;
} {
  if (isAppErrorFn(error)) {
    return {
      errorCode: error.error.type,
      errorMessage: "",
    };
  }
  if (error instanceof Error) {
    return {
      errorCode: "unknown_error",
      errorMessage: error.message,
    };
  }
  return {
    errorCode: "unknown_error",
    errorMessage: "Unknown error",
  };
}

export const ErrorModal: FC<ErrorModalProps> = ({ error }) => {
  const storageKey = useMemoryState((state) => state.storageKey);
  const theme = useAppState().getTheme(storageKey || "");
  const { closeModal, clearError } = useMemoryState();

  const { errorCode, errorMessage } = parseError(error);

  function handleClickClose() {
    if (isAppErrorFn(error)) {
      closeModal(error);
    }
    clearError();
  }

  return (
    <div className={styles.container}>
      <CommonModal className={styles.modal}>
        <div className={styles.closeButton} onClick={handleClickClose}>
          <XCloseIcon size={20} color="var(--fg-quaternary)" />
        </div>
        <div
          data-scroll-container
          className={styles.modalInnerContentContainer}
        >
          <div className={styles.errorIconContainer}>
            <ErrorIcon size={23} color="var(--fg-warning-primary)" />
            <div className={styles.ring1} />
            <div className={styles.ring2} />
          </div>
          <Spacing height={16} />

          <Typography size="lg" weight="semibold" color="secondary">
            Error Occurred
          </Typography>

          <Spacing height={16} />

          <div className={styles.errorMessageContainer}>
            {errorCode === "SIGNUP_DISABLED" ? (
              <Typography size="sm" weight="medium" color="primary">
                Oko is shutting down on June 1, 2026. New wallet creation is no
                longer available.
              </Typography>
            ) : (
              <>
                {errorCode && (
                  <Typography
                    size="sm"
                    weight="semibold"
                    color="warning-primary"
                  >
                    Error Code: {errorCode}
                  </Typography>
                )}
                {errorMessage && (
                  <Typography
                    size="sm"
                    weight="semibold"
                    color="warning-primary"
                  >
                    {errorMessage}
                  </Typography>
                )}
              </>
            )}
          </div>

          <Spacing height={12} />

          <a
            href="https://okowallet.userjot.com/board/report-bugs"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.supportLink}
          >
            <Typography
              className={styles.supportLinkText}
              size="xs"
              weight="medium"
              color="tertiary"
            >
              Get support
            </Typography>
          </a>

          <Spacing height={12} />
        </div>
        <div className={styles.buttonContainer}>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleClickClose}
            className={styles.bottomCloseButton}
          >
            Close
          </Button>
        </div>
        <Spacing height={12} />

        <SignWithOkoBox theme={theme} hideText={true} />
      </CommonModal>
    </div>
  );
};

export interface ErrorModalProps {
  error: AppError;
}
