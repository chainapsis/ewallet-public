import React, { type FC } from "react";
import { ErrorIcon } from "@oko-wallet/oko-common-ui/icons/error_icon";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Button } from "@oko-wallet/oko-common-ui/button";

import styles from "./session_expired_modal.module.scss";
import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import type { AppError } from "@oko-wallet-attached/errors";
import { SignWithOkoBox } from "@oko-wallet-attached/components/sign_with_oko_box/sign_with_oko_box";

export const SessionExpiredModal: FC<SessionExpiredModalProps> = ({ error }) => {
  const hostOrigin = useMemoryState((state) => state.hostOrigin);
  const theme = useAppState().getTheme(hostOrigin || "");
  const { closeModal, clearError } = useMemoryState();

  const errorType = error.error.type;
  const errorMessages: Record<string, { title: string; description: string }> = {
    api_key_not_found: {
      title: "Session Expired",
      description: "Your session has expired. Please sign in again through the Oko extension to continue.",
    },
    jwt_not_found: {
      title: "Session Expired",
      description: "Your session has expired. Please sign in again through the Oko extension to continue.",
    },
    wallet_not_found: {
      title: "Wallet Not Found",
      description: "No wallet found for this session. Please sign in through the Oko extension to continue.",
    },
    key_share_not_combined: {
      title: "Key Not Found",
      description: "Your signing key was not found. Please sign in again through the Oko extension to restore access.",
    },
  };

  const { title, description } = errorMessages[errorType] || {
    title: "Authentication Required",
    description: "Please sign in through the Oko extension to continue.",
  };

  function handleClickClose() {
    closeModal(error);
    clearError();
  }

  return (
    <div className={styles.container}>
      <CommonModal className={styles.modal}>
        <div className={styles.closeButton} onClick={handleClickClose}>
          <XCloseIcon size={20} color="var(--fg-quaternary)" />
        </div>
        <div className={styles.modalInnerContentContainer}>
          <div className={styles.errorIconContainer}>
            <ErrorIcon size={23} color="var(--fg-warning-primary)" />
            <div className={styles.ring1} />
            <div className={styles.ring2} />
          </div>
          <Spacing height={16} />

          <Typography size="lg" weight="semibold" color="secondary">
            {title}
          </Typography>

          <Spacing height={8} />

          <Typography
            size="sm"
            weight="regular"
            color="tertiary"
            style={{ textAlign: "center" }}
          >
            {description}
          </Typography>

          <Spacing height={24} />
        </div>
        <div className={styles.buttonContainer}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleClickClose}
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

export interface SessionExpiredModalProps {
  error: AppError;
}
