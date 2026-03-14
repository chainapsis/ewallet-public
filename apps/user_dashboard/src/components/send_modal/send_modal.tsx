"use client";

import { Card } from "@oko-wallet/oko-common-ui/card";
import { ChevronLeftIcon } from "@oko-wallet/oko-common-ui/icons/chevron_left";
import { XCloseIcon } from "@oko-wallet/oko-common-ui/icons/x_close";
import { Typography } from "@oko-wallet/oko-common-ui/typography";
import {
  type FC,
  type ReactNode,
  useCallback,
  useMemo,
  useReducer,
  useState,
} from "react";

import { EnterDetailsStep } from "./components/enter_details_step";
import { ReviewStep } from "./components/review_step";
import { SelectTokenStep } from "./components/select_token_step";
import { StatusStep } from "./components/status_step";
import styles from "./send_modal.module.scss";
import { initialSendFlowState, sendFlowReducer } from "./types";
import {
  useCosmosAddresses,
  useEthAddress,
  useSVMAddress,
} from "@oko-wallet-user-dashboard/hooks/queries/use_addresses";
import { useAddressValidation } from "@oko-wallet-user-dashboard/hooks/use_address_validation";
import { useFeeEstimate } from "@oko-wallet-user-dashboard/hooks/use_fee_estimate";
import { useSendTransaction } from "@oko-wallet-user-dashboard/hooks/use_send_transaction";
import type { TokenBalance } from "@oko-wallet-user-dashboard/types/token";

interface SendModalProps {
  renderTrigger: (props: { onOpen: () => void }) => ReactNode;
  initialToken?: TokenBalance;
  autoOpen?: boolean;
  onClose?: () => void;
}

const STEP_TITLES: Record<string, string> = {
  select_token: "Send",
  enter_details: "Send",
  review: "Review",
  status: "Transaction",
};

export const SendModal: FC<SendModalProps> = ({
  renderTrigger,
  initialToken,
  autoOpen = false,
  onClose: onCloseProp,
}) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [state, dispatch] = useReducer(
    sendFlowReducer,
    initialToken
      ? {
          ...initialSendFlowState,
          step: "enter_details" as const,
          selectedToken: initialToken,
        }
      : initialSendFlowState,
  );

  const { send } = useSendTransaction();

  // Addresses
  const { address: ethAddress } = useEthAddress();
  const { address: svmAddress } = useSVMAddress();
  const { addresses: cosmosAddresses } = useCosmosAddresses();

  const senderAddress = useMemo(() => {
    const chainInfo = state.selectedToken?.chainInfo;
    if (!chainInfo) {
      return undefined;
    }

    if (chainInfo.evm && !chainInfo.cosmos) {
      return ethAddress ?? undefined;
    }
    if (chainInfo.cosmos) {
      return cosmosAddresses[chainInfo.chainId] ?? undefined;
    }
    if (chainInfo.svm) {
      return svmAddress ?? undefined;
    }
    return undefined;
  }, [state.selectedToken, ethAddress, svmAddress, cosmosAddresses]);

  // Address validation for fee estimate
  const { validate } = useAddressValidation(
    state.selectedToken?.chainInfo ?? null,
    senderAddress,
  );
  const addressValidation = useMemo(
    () => validate(state.recipientAddress),
    [validate, state.recipientAddress],
  );

  // Fee estimate
  const feeEstimate = useFeeEstimate({
    selectedToken: state.selectedToken,
    recipientAddress: state.recipientAddress,
    amount: state.amount,
    senderAddress,
    isAddressValid: addressValidation.valid,
  });

  const onOpen = () => {
    if (initialToken) {
      dispatch({ type: "RESET" });
      dispatch({ type: "SELECT_TOKEN", payload: initialToken });
    } else {
      dispatch({ type: "RESET" });
    }
    setIsOpen(true);
  };

  const onClose = () => {
    setIsOpen(false);
    dispatch({ type: "RESET" });
    onCloseProp?.();
  };

  const handleBack = () => {
    switch (state.step) {
      case "enter_details":
        if (initialToken) {
          onClose();
        } else {
          dispatch({ type: "GO_TO_STEP", payload: "select_token" });
        }
        break;
      case "review":
        dispatch({ type: "GO_TO_STEP", payload: "enter_details" });
        break;
      default:
        break;
    }
  };

  const handleConfirmSend = useCallback(async () => {
    if (!state.selectedToken || !senderAddress) {
      return;
    }

    dispatch({ type: "TX_PENDING" });
    dispatch({ type: "GO_TO_STEP", payload: "status" });

    try {
      const txHash = await send(
        state.selectedToken,
        state.recipientAddress,
        state.amount,
        senderAddress,
        feeEstimate.feeRaw,
      );
      dispatch({ type: "TX_SUCCESS", payload: txHash });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Transaction failed";
      dispatch({ type: "TX_ERROR", payload: message });
    }
  }, [
    state.selectedToken,
    state.recipientAddress,
    state.amount,
    senderAddress,
    send,
    feeEstimate.feeRaw,
  ]);

  const showBackButton =
    state.step === "enter_details" || state.step === "review";

  return (
    <>
      {renderTrigger({ onOpen })}

      {isOpen && (
        <div className={styles.modalBackground} onClick={onClose}>
          <div
            className={styles.modal}
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <Card
              className={styles.modalCard}
              variant="elevated"
              padding="none"
            >
              {/* Header */}
              <div className={styles.header}>
                <div className={styles.headerLeft}>
                  {showBackButton && (
                    <button
                      type="button"
                      className={styles.backButton}
                      onClick={handleBack}
                      aria-label="Go back"
                    >
                      <ChevronLeftIcon color="var(--fg-quaternary)" size={20} />
                    </button>
                  )}
                  <Typography size="md" weight="semibold" color="primary">
                    {STEP_TITLES[state.step] ?? "Send"}
                  </Typography>
                </div>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <XCloseIcon color="var(--fg-quaternary)" size={20} />
                </button>
              </div>

              {/* Steps */}
              {state.step === "select_token" && (
                <SelectTokenStep
                  onSelectToken={(token) =>
                    dispatch({ type: "SELECT_TOKEN", payload: token })
                  }
                />
              )}

              {state.step === "enter_details" && state.selectedToken && (
                <EnterDetailsStep
                  tokenBalance={state.selectedToken}
                  senderAddress={senderAddress}
                  recipientAddress={state.recipientAddress}
                  amount={state.amount}
                  onRecipientChange={(addr) =>
                    dispatch({ type: "SET_RECIPIENT", payload: addr })
                  }
                  onAmountChange={(amount, amountRaw) =>
                    dispatch({
                      type: "SET_AMOUNT",
                      payload: { amount, amountRaw },
                    })
                  }
                  onContinue={() =>
                    dispatch({ type: "GO_TO_STEP", payload: "review" })
                  }
                  fee={feeEstimate.fee}
                  feeRaw={feeEstimate.feeRaw}
                  feeCurrency={feeEstimate.feeCurrency}
                  isFeeLoading={feeEstimate.isLoading}
                />
              )}

              {state.step === "review" &&
                state.selectedToken &&
                senderAddress && (
                  <ReviewStep
                    tokenBalance={state.selectedToken}
                    recipientAddress={state.recipientAddress}
                    senderAddress={senderAddress}
                    amount={state.amount}
                    fee={feeEstimate.fee}
                    feeCurrency={feeEstimate.feeCurrency}
                    isSubmitting={state.txStatus === "pending"}
                    onConfirm={handleConfirmSend}
                    onBack={handleBack}
                  />
                )}

              {state.step === "status" && state.selectedToken && (
                <StatusStep
                  txStatus={state.txStatus}
                  txHash={state.txHash}
                  txError={state.txError}
                  chainInfo={state.selectedToken.chainInfo}
                  onClose={onClose}
                  onRetry={() =>
                    dispatch({ type: "GO_TO_STEP", payload: "review" })
                  }
                />
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
};
