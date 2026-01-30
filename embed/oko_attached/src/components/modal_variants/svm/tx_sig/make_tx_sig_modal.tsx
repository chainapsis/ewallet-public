import type { FC } from "react";
import type { MakeSvmTxSignData } from "@oko-wallet/oko-sdk-core";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Button } from "@oko-wallet/oko-common-ui/button";

import styles from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_signature_modal.module.scss";
import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import { DemoView } from "@oko-wallet-attached/components/modal_variants/common/make_signature/demo_view";
import { SignWithOkoBox } from "@oko-wallet-attached/components/sign_with_oko_box/sign_with_oko_box";
import { trackTxButtonEvent } from "@oko-wallet-attached/analytics/events";
import { useTxSigModal } from "./use_tx_sig_modal";
import { SvmTxSignatureContent } from "./svm_tx_signature_content";
import { SvmTxFee } from "./svm_tx_fee";
import { useParseTx } from "./use_parse_tx";

export interface MakeTxSigModalProps {
  getIsAborted: () => boolean;
  modalId: string;
  data: MakeSvmTxSignData;
}

export const MakeTxSigModal: FC<MakeTxSigModalProps> = ({
  getIsAborted,
  data,
  modalId,
}) => {
  const { onReject, onApprove, isLoading, isApproveEnabled, isDemo, theme } =
    useTxSigModal({
      getIsAborted,
      data,
      modalId,
    });

  const {
    parsedTx,
    parseError,
    isLoading: isParsing,
  } = useParseTx(data.payload.data.serialized_transaction);

  function handleRejectClick() {
    trackTxButtonEvent({
      eventType: "reject",
      hostOrigin: data.payload.origin,
      chainType: "svm",
      instructions: parsedTx?.instructions ?? null,
    });

    onReject();
  }

  function handleApproveClick() {
    trackTxButtonEvent({
      eventType: "approve",
      hostOrigin: data.payload.origin,
      chainType: "svm",
      instructions: parsedTx?.instructions ?? null,
    });

    onApprove();
  }

  return (
    <div className={styles.container}>
      <CommonModal className={styles.modal}>
        <div className={styles.closeButton} onClick={handleRejectClick}>
          <XCloseIcon size={20} color="var(--fg-quaternary)" />
        </div>

        <div className={styles.modalInnerContentContainer}>
          <SvmTxSignatureContent
            payload={data.payload}
            parsedTx={parsedTx}
            parseError={parseError}
            isLoading={isParsing}
          />
        </div>

        <Spacing height={20} />

        <SvmTxFee
          serializedTransaction={data.payload.data.serialized_transaction}
          isVersioned={data.payload.data.is_versioned}
        />

        <Spacing height={16} />

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
            {isLoading ? "Signing..." : "Approve"}
          </Button>
        </div>
        <Spacing height={12} />

        <SignWithOkoBox theme={theme} />
      </CommonModal>

      {isDemo && <DemoView />}
    </div>
  );
};
