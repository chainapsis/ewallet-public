import { Button } from "@oko-wallet/oko-common-ui/button";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import type { MakeSvmMessageSignData } from "@oko-wallet/oko-sdk-core";
import { type FC, useMemo, useState } from "react";

import { SvmMessageSignatureContent } from "./svm_message_signature_content";
import { useMessageSigModal } from "./use_message_sig_modal";
import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import { DemoView } from "@oko-wallet-attached/components/modal_variants/common/make_signature/demo_view";
import styles from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_signature_modal.module.scss";
import { RiskWarningCheckBox } from "@oko-wallet-attached/components/modal_variants/common/risk_warning/risk_warning";
import { SvmSiwsSignatureContent } from "@oko-wallet-attached/components/modal_variants/svm/message_sig/siws_sig/make_siws_signature_content";
import {
  getSiwsMessage,
  verifySiwsMessage,
} from "@oko-wallet-attached/components/modal_variants/svm/siws_message";
import { SignWithOkoBox } from "@oko-wallet-attached/components/sign_with_oko_box/sign_with_oko_box";
import { hexToUint8Array } from "@oko-wallet-attached/crypto/keygen_ed25519";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

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

  const isMobileNative = useMemoryState((state) => state.isMobileNative);
  const siwsMessage = getSiwsMessage(decodedMessage);
  const isValidSiwsMessage = siwsMessage
    ? verifySiwsMessage(siwsMessage, data.payload.origin, {
        skipOriginCheck: isMobileNative,
      })
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

        <div
          data-scroll-container
          className={styles.modalInnerContentContainer}
        >
          {siwsMessage ? (
            <SvmSiwsSignatureContent payload={data.payload} theme={theme} />
          ) : (
            <SvmMessageSignatureContent payload={data.payload} />
          )}
        </div>

        <Spacing height={12} />

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

      {isDemo && <DemoView hideOnMobile />}
    </div>
  );
};
