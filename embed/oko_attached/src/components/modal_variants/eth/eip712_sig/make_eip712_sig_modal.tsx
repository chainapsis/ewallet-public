import { Button } from "@oko-wallet/oko-common-ui/button";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import type { MakeEIP712SigData } from "@oko-wallet/oko-sdk-core";
import type { FC } from "react";

import { EthereumEip712SignatureContent } from "./ethereum_eip712_signature_content";
import { useEIP712SigModal } from "./hooks/use_eip712_sig_modal";
import { ArbitrarySignatureDesc } from "@oko-wallet-attached/components/modal_variants/common/arbitrary_sig_desc/arbitrary_signature_desc";
import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import { DemoView } from "@oko-wallet-attached/components/modal_variants/common/make_signature/demo_view";
import styles from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_signature_modal.module.scss";
import { SignWithOkoBox } from "@oko-wallet-attached/components/sign_with_oko_box/sign_with_oko_box";

export const MakeEIP712SigModal: FC<MakeEIP712SigModalProps> = ({
  getIsAborted,
  data,
  modalId,
}) => {
  const { onReject, onApprove, isApproveEnabled, isLoading, isDemo, theme } =
    useEIP712SigModal({
      getIsAborted,
      data,
      modalId,
    });

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
          <EthereumEip712SignatureContent payload={data.payload} />
        </div>

        <Spacing height={12} />
        <ArbitrarySignatureDesc />

        <Spacing height={12} />

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

export interface MakeEIP712SigModalProps {
  getIsAborted: () => boolean;
  modalId: string;
  data: MakeEIP712SigData;
}
