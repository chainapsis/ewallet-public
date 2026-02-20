import { type FC } from "react";
import type { MakeTxSignSigData } from "@oko-wallet/oko-sdk-core";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Spacing } from "@oko-wallet/oko-common-ui/spacing";
import { Button } from "@oko-wallet/oko-common-ui/button";

import styles from "@oko-wallet-attached/components/modal_variants/common/make_signature/make_signature_modal.module.scss";
import { CommonModal } from "@oko-wallet-attached/components/modal_variants/common/common_modal";
import { DemoView } from "@oko-wallet-attached/components/modal_variants/common/make_signature/demo_view";
import { useTxSigModal } from "./hooks/use_tx_sig_modal";
import { EthereumTxFee } from "./eth_tx_fee";
import { EthereumTxSignatureContent } from "./ethereum_tx_signature_content";
import { useEthereumTxActions } from "./hooks/use_ethereum_tx_actions";
import { trackTxButtonEvent } from "@oko-wallet-attached/analytics/events";
import { SignWithOkoBox } from "@oko-wallet-attached/components/sign_with_oko_box/sign_with_oko_box";
import { SponsoredFee, BaseSponsorshipBackground } from "./sponsored_fee";
import sponsoredStyles from "./sponsored_fee/sponsored_modal.module.scss";

export const MakeTxSigModal: FC<MakeTxSigModalProps> = ({
  getIsAborted,
  data,
  modalId,
}) => {
  const {
    onReject,
    onApprove,
    isLoading,
    isApproveEnabled,
    primaryErrorMessage,
    isSimulating,
    simulatedTransaction,
    estimatedFee,
    isDemo,
    theme,
    // Sponsorship related
    showSponsorship,
    sponsoredFeeInfo,
    isRateLimited,
    isTooltipVisible,
    toggleTooltip,
  } = useTxSigModal({
    getIsAborted,
    data,
    modalId,
  });

  const { actions } = useEthereumTxActions(data.payload);

  function handleRejectClick() {
    // TODO: @elden
    trackTxButtonEvent({
      eventType: "reject",
      hostOrigin: data.payload.origin,
      chainType: "eth",
      chainId: data.payload.chain_info.chain_id,
      actions: actions as any,
    });

    onReject();
  }

  function handleApproveClick() {
    // TODO: @elden
    trackTxButtonEvent({
      eventType: "approve",
      hostOrigin: data.payload.origin,
      chainType: "eth",
      chainId: data.payload.chain_info.chain_id,
      actions: actions as any,
    });

    onApprove();
  }

  const isError = sponsoredFeeInfo?.state === "error";

  return (
    <div className={styles.container}>
      <CommonModal
        className={
          showSponsorship
            ? `${styles.modal} ${sponsoredStyles.sponsoredModal}`
            : styles.modal
        }
      >
        {/* Base sponsorship background */}
        {showSponsorship && (
          <BaseSponsorshipBackground isError={isError} theme={theme} />
        )}

        <div className={sponsoredStyles.content}>
          <div className={styles.closeButton} onClick={handleRejectClick}>
            <XCloseIcon size={20} color="var(--fg-quaternary)" />
          </div>

          <div className={styles.modalInnerContentContainer}>
            <EthereumTxSignatureContent
              payload={data.payload}
              simulatedTransaction={simulatedTransaction}
            />
          </div>

          <Spacing height={12} />
          {showSponsorship && sponsoredFeeInfo ? (
            <SponsoredFee
              info={sponsoredFeeInfo}
              isSimulating={isSimulating}
              showTooltip={true}
              tooltipVisible={isTooltipVisible}
              onTooltipToggle={toggleTooltip}
            />
          ) : (
            <EthereumTxFee
              payload={data.payload}
              primaryErrorMessage={primaryErrorMessage}
              isSimulating={isSimulating}
              estimatedFee={estimatedFee}
            />
          )}

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
              disabled={!isApproveEnabled || (showSponsorship && isRateLimited)}
            >
              {isLoading ? "Signing..." : "Approve"}
            </Button>
          </div>
          <Spacing height={12} />

          <SignWithOkoBox theme={theme} />
        </div>
      </CommonModal>

      {isDemo && <DemoView />}
    </div>
  );
};

export interface MakeTxSigModalProps {
  getIsAborted: () => boolean;
  modalId: string;
  data: MakeTxSignSigData;
}
