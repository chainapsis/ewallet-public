import { Button } from "@oko-wallet/oko-common-ui/button";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import type { CosmosArbitrarySigData } from "@oko-wallet/oko-sdk-core";
import type { FC } from "react";

import { CosmosArbitrarySignatureContent } from "./cosmos_arbitrary_signature_content";
import { useArbitrarySigModal } from "./use_arbitrary_sig_modal";
import { ArbitrarySignatureDesc } from "@oko-wallet-attached/components/modal_variants/common/arbitrary_sig_desc/arbitrary_signature_desc";
import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import { DemoView } from "@oko-wallet-attached/components/modal_variants/common/make_signature/demo_view";
import styles from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_signature_modal.module.scss";
import { SignWithOkoBox } from "@oko-wallet-attached/components/sign_with_oko_box/sign_with_oko_box";

export const MakeArbitrarySigModal: FC<MakeArbitrarySigModalProps> = ({
  getIsAborted,
  data,
  modalId,
}) => {
  const { onReject, onApprove, isLoading, isDemo, theme } =
    useArbitrarySigModal({
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
          <CosmosArbitrarySignatureContent payload={data.payload} />
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

export interface MakeArbitrarySigModalProps {
  getIsAborted: () => boolean;
  modalId: string;
  data: CosmosArbitrarySigData;
}
