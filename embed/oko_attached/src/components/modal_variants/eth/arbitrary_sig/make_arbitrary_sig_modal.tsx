import { useMemo, useState, type FC } from "react";
import type { MakeArbitrarySigData } from "@oko-wallet/oko-sdk-core";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Button } from "@oko-wallet/oko-common-ui/button";

import styles from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_signature_modal.module.scss";
import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import { DemoView } from "@oko-wallet-attached/components/modal_variants/common/make_signature/demo_view";
import { useArbitrarySigModal } from "./hooks/use_arbitrary_sig_modal";
import { ArbitrarySignatureDesc } from "@oko-wallet-attached/components/modal_variants/common/arbitrary_sig_desc/arbitrary_signature_desc";
import { EthereumArbitrarySignatureContent } from "./ethereum_arbitrary_signature_content";
import { SignWithOkoBox } from "@oko-wallet-attached/components/sign_with_oko_box/sign_with_oko_box";
import {
  getSiweMessage,
  verifySiweMessage,
} from "@oko-wallet-attached/components/modal_variants/eth/siwe_message";
import { EthereumSiweSignatureContent } from "@oko-wallet-attached/components/modal_variants/eth/arbitrary_sig/siwe_sig/make_siwe_signature_content";
import { RiskWarningCheckBox } from "@oko-wallet-attached/components/modal_variants/common/risk_warning/risk_warning";

export const MakeArbitrarySigModal: FC<MakeArbitrarySigModalProps> = ({
  getIsAborted,
  data,
  modalId,
}) => {
  const siweMessage = getSiweMessage(data.payload.data.message);
  const isValidSiweMessage = siweMessage
    ? verifySiweMessage(siweMessage, data.payload.origin)
    : false;
  const [isSiweRiskWarningChecked, setIsSiweRiskWarningChecked] =
    useState(false);

  const {
    onReject,
    onApprove,
    isApproveEnabled: isApproveEnabledOriginal,
    isLoading,
    isDemo,
    theme,
    hasOnChainSchema,
  } = useArbitrarySigModal({
    getIsAborted,
    data,
    modalId,
  });
  const isApproveEnabled = useMemo(() => {
    if (siweMessage && !isValidSiweMessage) {
      return isApproveEnabledOriginal && isSiweRiskWarningChecked;
    }

    return isApproveEnabledOriginal;
  }, [
    isApproveEnabledOriginal,
    isSiweRiskWarningChecked,
    siweMessage,
    isValidSiweMessage,
  ]);

  return (
    <div className={styles.container}>
      <CommonModal className={styles.modal}>
        <div className={styles.closeButton} onClick={onReject}>
          <XCloseIcon size={20} color="var(--fg-quaternary)" />
        </div>

        <div data-scroll-container className={styles.modalInnerContentContainer}>
          {!!siweMessage ? (
            <EthereumSiweSignatureContent
              payload={data.payload}
              theme={theme}
            />
          ) : (
            <EthereumArbitrarySignatureContent payload={data.payload} />
          )}
        </div>

        <Spacing height={12} />
        {!hasOnChainSchema && <ArbitrarySignatureDesc />}

        <Spacing height={12} />

        {siweMessage && !isValidSiweMessage && (
          <>
            <RiskWarningCheckBox
              checked={isSiweRiskWarningChecked}
              onChange={setIsSiweRiskWarningChecked}
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

export interface MakeArbitrarySigModalProps {
  getIsAborted: () => boolean;
  modalId: string;
  data: MakeArbitrarySigData;
}
