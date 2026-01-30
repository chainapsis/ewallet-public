import { useMemo, useState, type FC } from "react";
import type { MakeSvmMessageSignData } from "@oko-wallet/oko-sdk-core";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Button } from "@oko-wallet/oko-common-ui/button";

import styles from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_signature_modal.module.scss";
import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import { DemoView } from "@oko-wallet-attached/components/modal_variants/common/make_signature/demo_view";
import { SignWithOkoBox } from "@oko-wallet-attached/components/sign_with_oko_box/sign_with_oko_box";
import { useMessageSigModal } from "./use_message_sig_modal";
import { SvmMessageSignatureContent } from "./svm_message_signature_content";
import {
  getSiwsMessage,
  verifySiwsMessage,
} from "@oko-wallet-attached/components/modal_variants/svm/siws_message";
import { SvmSiwsSignatureContent } from "@oko-wallet-attached/components/modal_variants/svm/message_sig/siws_sig/make_siws_signature_content";
import { RiskWarningCheckBox } from "@oko-wallet-attached/components/modal_variants/common/risk_warning/risk_warning";
import { hexToUint8Array } from "@oko-wallet-attached/crypto/keygen_ed25519";

export interface MakeMessageSigModalProps {
  getIsAborted: () => boolean;
  modalId: string;
  data: MakeSvmMessageSignData;
}

export const MakeMessageSigModal: FC<MakeMessageSigModalProps> = ({
  getIsAborted,
  data,
  modalId,
}) => {
  // Decode hex message to check for SIWS
  const decodedMessage = useMemo(() => {
    try {
      const bytes = hexToUint8Array(data.payload.data.message);
      return new TextDecoder().decode(bytes);
    } catch {
      return data.payload.data.message;
    }
  }, [data.payload.data.message]);

  const siwsMessage = getSiwsMessage(decodedMessage);
  const isValidSiwsMessage = siwsMessage
    ? verifySiwsMessage(siwsMessage, data.payload.origin)
    : false;
  const [isSiwsRiskWarningChecked, setIsSiwsRiskWarningChecked] =
    useState(false);

  const {
    onReject,
    onApprove,
    isLoading,
    isApproveEnabled: isApproveEnabledOriginal,
    isDemo,
    theme,
  } = useMessageSigModal({
    getIsAborted,
    data,
    modalId,
  });

  const isApproveEnabled = useMemo(() => {
    if (siwsMessage && !isValidSiwsMessage) {
      return isApproveEnabledOriginal && isSiwsRiskWarningChecked;
    }

    return isApproveEnabledOriginal;
  }, [
    isApproveEnabledOriginal,
    isSiwsRiskWarningChecked,
    siwsMessage,
    isValidSiwsMessage,
  ]);

  return (
    <div className={styles.container}>
      <CommonModal className={styles.modal}>
        <div className={styles.closeButton} onClick={onReject}>
          <XCloseIcon size={20} color="var(--fg-quaternary)" />
        </div>

        <div className={styles.modalInnerContentContainer}>
          {!!siwsMessage ? (
            <SvmSiwsSignatureContent payload={data.payload} theme={theme} />
          ) : (
            <SvmMessageSignatureContent payload={data.payload} />
          )}
        </div>

        <Spacing height={16} />

        {siwsMessage && !isValidSiwsMessage && (
          <>
            <RiskWarningCheckBox
              checked={isSiwsRiskWarningChecked}
              onChange={setIsSiwsRiskWarningChecked}
            />
            <Spacing height={12} />
          </>
        )}

        <div className={styles.buttonContainer}>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onReject}
            className={styles.rejectButton}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onApprove}
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
