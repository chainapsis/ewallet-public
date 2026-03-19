import { AuthInfo } from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import type { ChainInfo, StdSignDoc } from "@keplr-wallet/types";
import type { Theme } from "@oko-wallet/oko-common-ui/theme";
import type {
  CosmosTxSigData,
  MakeCosmosSigError,
  MakeSigModalErrorAckPayload,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import {
  extractAuthInfoFromSignDoc,
  isEthereumCompatible,
  type SignDoc,
} from "@oko-wallet/oko-sdk-cosmos";
import type { Result } from "@oko-wallet/stdlib-js";
import { useState } from "react";

import type { FeeCalculated, InsufficientBalanceFee } from "./types";
import { useCosmosSignFee } from "./use_sign_fee";
import { makeCosmosSignature } from "@oko-wallet-attached/components/modal_variants/cosmos/cosmos_sig";
import { isDemoOrSandboxOrigin } from "@oko-wallet-attached/requests/endpoints";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import { normalizeIBCDenom } from "@oko-wallet-attached/web3/cosmos/normalize_denom";
import {
  extractMsgsFromSignDoc,
  signDocToJson,
} from "@oko-wallet-attached/web3/cosmos/sign_doc";

export function useTxSigModal(
  args: UseCosmosTxSigModalArgs,
): Result<UseCosmosTxSigModalReturn, MakeCosmosSigError> {
  const { data, modalId, getIsAborted } = args;
  const payload = data.payload;
  const { closeModal, setError } = useMemoryState();

  const hostOrigin = payload.origin;
  const storageKey = useMemoryState((state) => state.storageKey);
  const isMobileNative = useMemoryState((state) => state.isMobileNative);
  const mobileApiKey = useMemoryState((state) => state.apiKey);
  const theme = useAppState().getTheme(storageKey);

  const [isLoading, setIsLoading] = useState(false);

  const isDemo = isDemoOrSandboxOrigin(hostOrigin, {
    isMobileNative,
    apiKey: mobileApiKey,
  });

  const feeFromSignDoc = extractFeeFromSignDoc(payload.signDoc);

  const msgsRes = extractMsgsFromSignDoc(payload.signDoc);

  if (!msgsRes.success) {
    const err: MakeSigModalErrorAckPayload = {
      modal_type: "cosmos/make_signature",
      modal_id: modalId,
      type: "error",
      error: {
        type: "sign_doc_parse_fail",
        error: msgsRes.err,
      },
    };

    setError(err);
    closeModal(err);

    return {
      success: false,
      err: msgsRes.err,
    };
  }
  const msgs = msgsRes.data;

  // biome-ignore lint/correctness/useHookAtTopLevel: hook is called after early return guard
  const signFee = useCosmosSignFee({
    preferNoSetFee: !!data.payload.signOptions?.preferNoSetFee,
    disableBalanceCheck: !!data.payload.signOptions?.disableBalanceCheck,
    simulationKey: modalId,
    modalChainInfo: data.payload.chain_info,
    signer: data.payload.signer,
    defaultFee: feeFromSignDoc?.fee,
    gas: feeFromSignDoc?.gas ?? 0,
    msgs,
    hostOrigin,
  });

  function mergeFeeToSignDoc<T extends SignDoc | StdSignDoc>(
    signDoc: T,
    fee: { amount: string; denom: string } | undefined,
    gas: number,
  ): T {
    if (!("authInfoBytes" in signDoc)) {
      return {
        ...signDoc,
        fee: {
          // XXX:
          // 현재 payer, granter는 Oko에서 지원되지 않는다.
          // 수수료 대납을 이용한 공격이 있을 수 있으므로 명시적으로
          // 비워놓도록 한다.
          granter: undefined,
          payer: undefined,
          amount: fee
            ? [
                {
                  amount: fee.amount,
                  denom: normalizeIBCDenom(fee.denom),
                },
              ]
            : [],
          gas: gas.toString(),
        },
      };
    }

    const authInfo = AuthInfo.decode(signDoc.authInfoBytes);
    return {
      ...signDoc,
      authInfoBytes: AuthInfo.encode({
        ...authInfo,
        fee: {
          // XXX:
          // 현재 payer, granter는 Oko에서 지원되지 않는다.
          // 수수료 대납을 이용한 공격이 있을 수 있으므로 명시적으로
          // 비워놓도록 한다.
          payer: "",
          granter: "",
          amount: fee
            ? [{ amount: fee.amount, denom: normalizeIBCDenom(fee.denom) }]
            : [],
          gasLimit: gas.toString(),
        },
      }).finish(),
    };
  }

  let sigData = data;
  const signDoc = data.payload.signDoc;

  const signDocAfterFee = mergeFeeToSignDoc(
    signDoc,
    signFee.fee?.amount?.toCoin(),
    signFee.gas,
  );
  const signDocJsonRes = signDocToJson(signDocAfterFee);
  if (!signDocJsonRes.success) {
    return {
      success: false,
      err: signDocJsonRes.err,
    };
  }

  const signDocJson = signDocJsonRes.data;

  if (!("authInfoBytes" in signDocAfterFee)) {
    sigData = {
      ...data,
      payload: {
        ...data.payload,
        signDoc: signDocAfterFee,
      },
    };
  } else {
    sigData = {
      ...data,
      payload: {
        ...data.payload,
        signDoc: signDocAfterFee,
      },
    };
  }

  const isApproveButtonDisabled =
    (signFee.fee === null && !signFee.isLoading) ||
    signFee.error !== null ||
    signFee.isLoading;

  function onReject() {
    const ack: OpenModalAckPayload = {
      modal_type: "cosmos/make_signature",
      modal_id: modalId,
      type: "reject",
    };

    closeModal(ack);
  }

  async function onApprove() {
    try {
      if (getIsAborted()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const chainInfo = data.payload.chain_info;

      const signDocAfterFee = mergeFeeToSignDoc(
        data.payload.signDoc,
        signFee.fee?.amount?.toCoin(),
        signFee.gas,
      );

      const isEthermintLike = isEthereumCompatible(
        chainInfo as unknown as ChainInfo,
      );

      const signatureRes = await makeCosmosSignature(
        storageKey,
        signDocAfterFee,
        isEthermintLike ? "keccak256" : "sha256",
        getIsAborted,
      );

      if (!signatureRes.success) {
        const err: MakeSigModalErrorAckPayload = {
          modal_type: "cosmos/make_signature",
          modal_id: modalId,
          type: "error",
          error: signatureRes.err,
        };

        setError(err);
        closeModal(err);
        return;
      }

      const ack: OpenModalAckPayload = {
        modal_type: "cosmos/make_signature",
        modal_id: modalId,
        type: "approve",
        data: {
          chain_type: "cosmos",
          sig_result: {
            signature: signatureRes.data,
            signed: signDocAfterFee,
          },
        },
      };

      closeModal(ack);
    } catch (error: any) {
      console.error("Error making cosmos sig", error);

      const err = {
        modal_type: "cosmos/make_signature" as const,
        modal_id: modalId,
        type: "error" as const,
        error: {
          type: "unknown_error" as const,
          error: error,
        },
      };
      setError(err);
      closeModal(err);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    success: true,
    data: {
      onReject,
      onApprove,
      isLoading,
      isFeeLoading: signFee.isLoading,
      isApproveButtonDisabled,
      isDemo,
      theme,
      sigData,
      signDocJson,
      insufficientBalanceFee: signFee.insufficientBalanceFee,
    },
  };
}

function extractFeeFromSignDoc(
  signDoc: SignDoc | StdSignDoc,
): FeeCalculated | null {
  if (!("authInfoBytes" in signDoc)) {
    if (signDoc.fee.amount.length === 0) {
      return {
        fee: undefined,
        gas: parseInt(signDoc.fee.gas, 10),
      };
    }
    return {
      fee: {
        amount: signDoc.fee.amount[0].amount,
        denom: signDoc.fee.amount[0].denom,
      },
      gas: parseInt(signDoc.fee.gas, 10),
    };
  }

  const authInfo = extractAuthInfoFromSignDoc(signDoc);
  if (!authInfo?.fee) {
    return null;
  }
  if (authInfo.fee.amount.length === 0) {
    return {
      fee: undefined,
      gas: parseInt(authInfo.fee.gasLimit, 10),
    };
  }
  return {
    fee: {
      amount: authInfo.fee.amount[0].amount,
      denom: authInfo.fee.amount[0].denom,
    },
    gas: parseInt(authInfo.fee.gasLimit, 10),
  };
}

export interface UseCosmosTxSigModalArgs {
  data: CosmosTxSigData;
  modalId: string;
  getIsAborted: () => boolean;
}

export interface UseCosmosTxSigModalReturn {
  onReject: () => void;
  onApprove: () => void;
  isLoading: boolean;
  isFeeLoading: boolean;
  isApproveButtonDisabled: boolean;
  isDemo: boolean;
  theme: Theme | null;
  sigData: CosmosTxSigData;
  signDocJson: StdSignDoc;
  insufficientBalanceFee: InsufficientBalanceFee | null;
}
