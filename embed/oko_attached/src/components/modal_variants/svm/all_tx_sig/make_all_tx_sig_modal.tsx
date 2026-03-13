import { Button } from "@oko-wallet/oko-common-ui/button";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import type { MakeSvmAllTxSignData } from "@oko-wallet/oko-sdk-core";
import type { FC } from "react";

import { SvmAllTxSignatureContent } from "./svm_all_tx_signature_content";
import { useAllTxSigModal } from "./use_all_tx_sig_modal";
import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import { DemoView } from "@oko-wallet-attached/components/modal_variants/common/make_signature/demo_view";
import styles from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_signature_modal.module.scss";
import { SignWithOkoBox } from "@oko-wallet-attached/components/sign_with_oko_box/sign_with_oko_box";

export interface MakeAllTxSigModalProps {
  getIsAborted: () => boolean;
  modalId: string;
  data: MakeSvmAllTxSignData;
}

export const MakeAllTxSigModal: FC<MakeAllTxSigModalProps> = ({
  getIsAborted,
  data,
  modalId,
}) => {
  const {
    onReject,
    onApprove,
    isLoading,
    isApproveEnabled,
    isDemo,
    theme,
    txCount,
    signingProgress,
  } = useAllTxSigModal({
    getIsAborted,
    data,
    modalId,
  });

  function handleRejectClick() {
    onReject();
  }

  function handleApproveClick() {
    onApprove();
  }

  const buttonText = isLoading
    ? `Signing ${signingProgress}/${txCount}...`
    : "Approve All";

  return (
    <div className={styles.container}>
      <CommonModal className={styles.modal}>
        <div className={styles.closeButton} onClick={handleRejectClick}>
          <XCloseIcon size={20} color="var(--fg-quaternary)" />
        </div>

        <div
          data-scroll-container
          className={styles.modalInnerContentContainer}
        >
          <SvmAllTxSignatureContent payload={data.payload} />
        </div>

        <Spacing height={12} />

        <div className={styles.buttonContainer}>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleRejectClick}
            className={styles.rejectButton}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleApproveClick}
            isLoading={isLoading}
            disabled={!isApproveEnabled}
          >
            {buttonText}
          </Button>
        </div>
        <Spacing height={12} />

        <SignWithOkoBox theme={theme} />
      </CommonModal>

      {isDemo && <DemoView />}
    </div>
  );
};
