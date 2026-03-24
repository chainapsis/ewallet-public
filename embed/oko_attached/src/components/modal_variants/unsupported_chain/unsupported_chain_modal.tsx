import { Button } from "@oko-wallet/oko-common-ui/button";
import { ErrorIcon } from "@oko-wallet/oko-common-ui/icons/error_icon";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import type { FC } from "react";

import styles from "./unsupported_chain_modal.module.scss";
import { Avatar } from "@oko-wallet-attached/components/avatar/avatar";
import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import { SignWithOkoBox } from "@oko-wallet-attached/components/sign_with_oko_box/sign_with_oko_box";
import type { AppError } from "@oko-wallet-attached/errors";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

export const UnsupportedChainModal: FC<ErrorModalProps> = ({
  chainName,
  chainSymbolImageUrl,
  error,
}) => {
  const storageKey = useMemoryState((state) => state.storageKey);
  const theme = useAppState().getTheme(storageKey || "");
  const { closeModal, clearError } = useMemoryState();

  function handleClickClose() {
    if (error) {
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
            Unsupported Chain
          </Typography>

          <Spacing height={16} />

          <div className={styles.chainInfoContainer}>
            <div className={styles.chainNameContainer}>
              <Avatar
                src={chainSymbolImageUrl}
                alt={chainName}
                size="sm"
                variant="rounded"
              />
              <Typography size="sm" weight="semibold" color="tertiary">
                {chainName}
              </Typography>
            </div>
            <Typography size="sm" weight="medium" color="tertiary">
              This chain isn’t supported yet. Try another one.
            </Typography>
          </div>

          <Spacing height={16} />
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

        <SignWithOkoBox theme={theme} hideText={true} />
      </CommonModal>
    </div>
  );
};

export interface ErrorModalProps {
  chainName: string;
  chainSymbolImageUrl?: string;
  error?: AppError;
}
