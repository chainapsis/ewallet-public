import { useEffect, useState, useCallback } from "react";
import type {
  MakeSigModalErrorAckPayload,
  MakeTxSignSigData,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import {
  toTransactionSerializable,
  isSignableTransaction,
} from "@oko-wallet/oko-sdk-eth";
import {
  createPublicClient,
  formatEther,
  hexToBigInt,
  http,
  type RpcTransactionRequest,
} from "viem";

import { makeEthereumTxSignature } from "@oko-wallet-attached/web3/ethereum/sig";
import { useAppState } from "@oko-wallet-attached/store/app";
import {
  useGetNonce,
  useGetFeeData,
  useGetGasEstimation,
  useGetL1GasEstimation,
  useGetFeeCurrencyBalance,
  useBaseSponsorshipFlow,
} from "@oko-wallet-attached/web3/ethereum/queries";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import { DEMO_WEB_ORIGIN } from "@oko-wallet-attached/requests/endpoints";
import { DEFAULT_GAS_ESTIMATION } from "@oko-wallet-attached/web3/ethereum/queries/types";
import {
  DEFAULT_ETH_FEE_TYPE,
  OP_STACK_L1_DATA_FEE_FEATURE,
} from "@oko-wallet-attached/web3/ethereum/constants";
import { useSupportedEthChain } from "@oko-wallet-attached/web3/ethereum/hooks/use_supported_eth_chain";
import { isSponsorshipSupportedChain } from "@oko-wallet-attached/requests/fee_sponsorship";
import type { SponsoredFeeInfo } from "../sponsored_fee/types";

export interface UseEthereumSigModalArgs {
  modalId: string;
  data: MakeTxSignSigData;
  getIsAborted: () => boolean;
}

export function useTxSigModal(args: UseEthereumSigModalArgs) {
  const { getIsAborted, modalId, data } = args;
  const { closeModal, setError } = useMemoryState();

  const hostOrigin = data.payload.origin;
  const theme = useAppState().getTheme(hostOrigin);

  const [isLoading, setIsLoading] = useState(false);
  const [simulatedTransaction, setSimulatedTransaction] =
    useState<RpcTransactionRequest | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<EstimatedFee | null>(null);
  const [hasSufficientBalanceForTotal, setHasSufficientBalanceForTotal] =
    useState<boolean | null>(null);
  const [hasSufficientBalanceForValue, setHasSufficientBalanceForValue] =
    useState<boolean | null>(null);
  const [primaryErrorMessage, setPrimaryErrorMessage] = useState<string | null>(
    null,
  );

  // Key to trigger fresh simulation for each new modal request
  const simulationKey = modalId;
  const payload = data.payload;

  const originalTransaction = payload.data.transaction;
  const signer = payload.signer as `0x${string}`;

  const chainInfo = payload.chain_info;
  const isOpStack =
    chainInfo.features?.includes(OP_STACK_L1_DATA_FEE_FEATURE) ?? false;
  const isSponsorshipSupported = isSponsorshipSupportedChain(
    chainInfo.chain_id,
  );

  // Tooltip visibility state
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const toggleTooltip = useCallback(() => {
    setIsTooltipVisible((prev) => !prev);
  }, []);

  const { isSupportedChain, evmChain, isSupportChecked } = useSupportedEthChain(
    {
      chainInfoForModal: chainInfo,
    },
  );

  useEffect(() => {
    if (!isSupportChecked) {
      return;
    }

    if (!isSupportedChain) {
      setError({
        modal_type: "eth/make_signature",
        modal_id: modalId,
        type: "error",
        error: {
          type: "chain_not_supported",
          data: {
            chain_id: chainInfo.chain_id,
            chain_name: chainInfo.chain_name,
            chain_symbol_image_url: chainInfo.chain_symbol_image_url,
          },
        },
      });
    }
  }, [isSupportedChain, isSupportChecked]);

  const publicClient = evmChain
    ? createPublicClient({
        chain: evmChain,
        transport: http(),
      })
    : undefined;

  const feeType =
    originalTransaction.type === "0x0" ? "legacy" : DEFAULT_ETH_FEE_TYPE;

  const {
    data: nonce,
    error: getNonceError,
    isFetching: isNonceFetching,
  } = useGetNonce({
    simulationKey,
    signer,
    chain: evmChain,
    client: publicClient,
    options: {
      enabled: isSupportedChain,
    },
  });

  const {
    data: feeData,
    error: getFeeDataError,
    isFetching: isFeeDataFetching,
  } = useGetFeeData({
    simulationKey,
    chain: evmChain,
    client: publicClient,
    feeType,
    options: {
      enabled: isSupportedChain,
    },
  });

  const {
    data: gasEstimation,
    error: getGasEstimationError,
    isFetching: isGasEstimationFetching,
  } = useGetGasEstimation({
    simulationKey,
    signer,
    rpcTxRequest: originalTransaction,
    nonce: nonce,
    client: publicClient,
    hostOrigin: payload.origin,
    options: {
      enabled: isSupportedChain,
    },
  });

  const {
    data: l1GasEstimation,
    error: getL1GasEstimationError,
    isFetching: isL1GasEstimationFetching,
  } = useGetL1GasEstimation({
    simulationKey,
    signer,
    rpcTxRequest: originalTransaction,
    chain: evmChain,
    nonce: nonce,
    client: publicClient,
    options: {
      enabled: isSupportedChain && isOpStack,
    },
  });

  const {
    data: feeCurrencyBalance,
    error: getFeeCurrencyBalanceError,
    isFetching: isFeeCurrencyBalanceFetching,
  } = useGetFeeCurrencyBalance({
    simulationKey,
    signer,
    chain: evmChain,
    client: publicClient,
  });

  const isSimulating =
    isNonceFetching ||
    isFeeDataFetching ||
    isGasEstimationFetching ||
    isL1GasEstimationFetching ||
    isFeeCurrencyBalanceFetching;

  const hasError =
    getNonceError !== null ||
    getFeeDataError !== null ||
    getGasEstimationError !== null ||
    getL1GasEstimationError !== null ||
    getFeeCurrencyBalanceError !== null;

  const isDemo = !!hostOrigin && hostOrigin === DEMO_WEB_ORIGIN;

  // Fee sponsorship flow for Base chain
  const {
    sponsorshipState,
    isSponsored,
    isSponsorshipAvailable,
    isRateLimited,
    needsSponsorship,
    statusData: sponsorshipStatusData,
    remainingTimeMs: sponsorshipRemainingTimeMs,
    formattedRemainingTime: sponsorshipFormattedTime,
    requestSponsorship,
    error: sponsorshipError,
    errorMessage: sponsorshipErrorMessage,
    isCheckingStatus: isSponsorshipChecking,
    isRequestingTopUp: isSponsorshipRequesting,
  } = useBaseSponsorshipFlow({
    simulationKey,
    chainId: chainInfo.chain_id,
    recipientAddress: signer,
    hostOrigin,
    estimatedFeeWei: estimatedFee?.raw,
    hasSufficientBalance: hasSufficientBalanceForTotal,
    publicClient: publicClient ?? undefined,
    enabled: isSponsorshipSupported && !isDemo,
  });

  // Determine if sponsorship should be shown
  // Show when the user can cover the tx value but not the total (value + fee)
  // (sponsorship covers fee, not the transfer amount)
  const showSponsorship =
    isSponsorshipSupported &&
    !isDemo &&
    hasSufficientBalanceForValue !== false &&
    hasSufficientBalanceForTotal === false &&
    sponsorshipState !== "unavailable";

  // Create sponsored fee info for UI
  const sponsoredFeeInfo: SponsoredFeeInfo | null = showSponsorship
    ? {
        state: sponsorshipState,
        originalFee: estimatedFee?.formatted ?? "-",
        remainingTimeMs: sponsorshipRemainingTimeMs,
        formattedRemainingTime: isRateLimited
          ? sponsorshipFormattedTime
          : "5 min",
        errorMessage: sponsorshipErrorMessage,
      }
    : null;

  // Approve is enabled when:
  // 1. Not simulating and no errors and sufficient balance, OR
  // 2. Sponsorship is available (balance insufficient but can be sponsored), OR
  // 3. Already sponsored
  const isApproveEnabled =
    !isSimulating &&
    !hasError &&
    (hasSufficientBalanceForTotal === true ||
      (needsSponsorship && isSponsorshipAvailable) ||
      isSponsored);

  // Approve button should show loading when requesting sponsorship
  const isApproveLoading = isLoading || isSponsorshipRequesting;

  // adjust the transaction to be simulated
  useEffect(() => {
    const result: RpcTransactionRequest = {
      ...originalTransaction,
    };

    if (nonce !== undefined) {
      result.nonce = `0x${nonce.toString(16)}` as `0x${string}`;
    }

    if (gasEstimation !== undefined) {
      result.gas = `0x${gasEstimation.toString(16)}` as `0x${string}`;
    } else if (
      originalTransaction.data === undefined ||
      originalTransaction.data === "0x"
    ) {
      // if the transaction is just send, use the default gas limit
      result.gas = `0x${DEFAULT_GAS_ESTIMATION.toString(16)}` as `0x${string}`;
    }

    if (feeData !== undefined) {
      if (feeData.type === "eip1559") {
        if (
          feeData.maxFeePerGas === undefined ||
          feeData.maxPriorityFeePerGas === undefined
        ) {
          return;
        }

        result.maxFeePerGas =
          `0x${feeData.maxFeePerGas.toString(16)}` as `0x${string}`;
        result.maxPriorityFeePerGas =
          `0x${feeData.maxPriorityFeePerGas.toString(16)}` as `0x${string}`;
      } else {
        if (!feeData.gasPrice) {
          return;
        }

        result.gasPrice = `0x${feeData.gasPrice.toString(16)}` as `0x${string}`;
      }
    }

    setSimulatedTransaction(result);
  }, [originalTransaction, nonce, feeData, gasEstimation]);

  // calculate the estimated fee
  useEffect(() => {
    const adjustedGasEstimation =
      gasEstimation ??
      (originalTransaction.data === undefined ||
      originalTransaction.data === "0x"
        ? DEFAULT_GAS_ESTIMATION
        : undefined);

    if (adjustedGasEstimation === undefined) {
      return;
    }

    if (feeData === undefined) {
      return;
    }

    // On OP Stack chains, wait for L1 gas estimation before setting the fee
    // to prevent a race condition where the fee is set without L1 data fee
    if (isOpStack && !l1GasEstimation) {
      return;
    }

    let total: bigint;

    // NOTE: as of now, we only support native currency as fee currency
    // more complex fee calculation will be supported in the future
    if (feeData.type === "eip1559") {
      total = adjustedGasEstimation * feeData.maxFeePerGas!;
    } else {
      total = adjustedGasEstimation * feeData.gasPrice!;
    }

    if (l1GasEstimation) {
      total += l1GasEstimation.l1Fee;
    }

    const estimatedFee = {
      raw: total,
      formatted: `${formatEther(total)} ETH`,
    };

    setEstimatedFee(estimatedFee);
  }, [originalTransaction, feeData, l1GasEstimation, gasEstimation, isOpStack]);

  // check if the balance is sufficient for the transaction
  useEffect(() => {
    if (isDemo) {
      setHasSufficientBalanceForTotal(true);
      setHasSufficientBalanceForValue(true);
      return;
    }

    if (estimatedFee === null) {
      return;
    }

    if (feeCurrencyBalance === undefined) {
      return;
    }

    if (!estimatedFee || !feeCurrencyBalance) {
      return;
    }

    const txValue = hexToBigInt(originalTransaction?.value ?? "0x0");
    const totalValue = estimatedFee.raw + txValue;

    setHasSufficientBalanceForTotal(feeCurrencyBalance.amount >= totalValue);
    setHasSufficientBalanceForValue(feeCurrencyBalance.amount >= txValue);
  }, [estimatedFee, feeCurrencyBalance, originalTransaction]);

  // set the primary error message
  useEffect(() => {
    if (isDemo) {
      setPrimaryErrorMessage("");
      return;
    }

    if (isSimulating) {
      setPrimaryErrorMessage("");
      return;
    }

    if (getFeeCurrencyBalanceError !== null) {
      setPrimaryErrorMessage(
        getFeeCurrencyBalanceError.userMessage ??
          getFeeCurrencyBalanceError.message,
      );
      return;
    }

    if (getGasEstimationError !== null) {
      if (getGasEstimationError.category === "INSUFFICIENT_BALANCE") {
        setPrimaryErrorMessage("Insufficient balance to cover the transaction");
        return;
      }

      setPrimaryErrorMessage(
        getGasEstimationError.userMessage ?? getGasEstimationError.message,
      );
      return;
    }

    if (getNonceError !== null) {
      setPrimaryErrorMessage(
        getNonceError.userMessage ?? getNonceError.message,
      );
      return;
    }

    if (getFeeDataError !== null) {
      setPrimaryErrorMessage(
        getFeeDataError.userMessage ?? getFeeDataError.message,
      );
      return;
    }

    if (getL1GasEstimationError !== null) {
      setPrimaryErrorMessage(
        getL1GasEstimationError.userMessage ?? getL1GasEstimationError.message,
      );
      return;
    }

    if (isSponsorshipSupported) {
      // Fee insufficient: value is covered but total (value + fee) is not
      if (hasSufficientBalanceForValue === true && hasSufficientBalanceForTotal === false) {
        const canSuppressInsufficientError =
          isSponsorshipAvailable ||
          isSponsored ||
          isRateLimited ||
          sponsorshipState === "error" ||
          isSponsorshipChecking;

        if (canSuppressInsufficientError) {
          setPrimaryErrorMessage("");
          return;
        }

        setPrimaryErrorMessage("Insufficient balance to cover the transaction");
        return;
      }

      // Value itself is insufficient
      if (hasSufficientBalanceForValue === false) {
        setPrimaryErrorMessage("Insufficient balance to cover the transaction");
        return;
      }

      setPrimaryErrorMessage("");
      return;
    }

    // Non-sponsorship-supported chains
    if (hasSufficientBalanceForValue === false || hasSufficientBalanceForTotal === false) {
      setPrimaryErrorMessage("Insufficient balance to cover the transaction");
      return;
    }

    setPrimaryErrorMessage("");
  }, [
    isSimulating,
    getNonceError,
    getFeeDataError,
    getGasEstimationError,
    getFeeCurrencyBalanceError,
    getL1GasEstimationError,
    hasSufficientBalanceForValue,
    hasSufficientBalanceForTotal,
    isSponsorshipSupported,
    isSponsorshipAvailable,
    isSponsored,
    isRateLimited,
    sponsorshipState,
    isSponsorshipChecking,
  ]);

  function onReject() {
    const ack: OpenModalAckPayload = {
      modal_type: "eth/make_signature",
      modal_id: modalId,
      type: "reject",
    };

    closeModal(ack);
  }

  async function onApprove() {
    try {
      if (getIsAborted()) {
        return;
      }

      setIsLoading(true);

      // If balance is insufficient and sponsorship is available, request sponsorship first
      if (
        hasSufficientBalanceForTotal === false &&
        isSponsorshipAvailable &&
        !isSponsored
      ) {
        const sponsorshipResult = await requestSponsorship();
        if (!sponsorshipResult) {
          return;
        }
      }

      if (simulatedTransaction === null) {
        // unreachable
        return;
      }

      const isSignable = isSignableTransaction(simulatedTransaction);
      if (!isSignable) {
        const err: MakeSigModalErrorAckPayload = {
          modal_type: "eth/make_signature",
          modal_id: modalId,
          type: "error",
          error: {
            type: "not_signable_tx",
          },
        };
        setError(err);

        return;
      }

      const txSerializable = toTransactionSerializable({
        chainId: data.payload.chain_info.chain_id,
        tx: simulatedTransaction,
      });

      const signedTransactionRes = await makeEthereumTxSignature(
        hostOrigin,
        txSerializable,
        getIsAborted,
      );

      if (!signedTransactionRes.success) {
        console.log("make eth tx sig fail", signedTransactionRes.err);

        const err: MakeSigModalErrorAckPayload = {
          modal_type: "eth/make_signature",
          modal_id: modalId,
          type: "error",
          error: signedTransactionRes.err,
        };
        setError(err);

        return;
      }

      const signedTransaction = signedTransactionRes.data;

      const ack: OpenModalAckPayload = {
        modal_type: "eth/make_signature",
        modal_id: modalId,
        type: "approve",
        data: {
          chain_type: "eth",
          sig_result: {
            type: "signed_transaction",
            signedTransaction,
          },
        },
      };

      closeModal(ack);
    } catch (error: any) {
      console.error("error in making eth sig", error);

      const ack: MakeSigModalErrorAckPayload = {
        modal_type: "eth/make_signature",
        modal_id: modalId,
        type: "error",
        error: error.toString(),
      };

      setError(ack);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    onReject,
    onApprove,
    isLoading: isApproveLoading,
    isApproveEnabled,
    isDemo,
    isSimulating,
    estimatedFee,
    theme,
    primaryErrorMessage,
    simulatedTransaction,
    // Sponsorship related
    showSponsorship,
    sponsoredFeeInfo,
    isRateLimited,
    isSponsorshipRequesting,
    isTooltipVisible,
    toggleTooltip,
  };
}

export interface EstimatedFee {
  raw: bigint;
  formatted: string;
}
