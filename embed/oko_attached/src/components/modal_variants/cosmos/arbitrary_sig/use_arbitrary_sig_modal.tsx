import type { ChainInfo } from "@keplr-wallet/types";
import type {
  CosmosArbitrarySigData,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import { isEthereumCompatible } from "@oko-wallet/oko-sdk-cosmos";
import { useState } from "react";

import { makeCosmosSignature } from "../cosmos_sig";
import { DEMO_WEB_ORIGIN } from "@oko-wallet-attached/requests/endpoints";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";

export function useArbitrarySigModal(args: UseCosmosArbitrarySigModalArgs) {
  const { data, modalId, getIsAborted } = args;
  const { closeModal } = useMemoryState();

  const hostOrigin = data.payload.origin;
  const theme = useAppState().getTheme(hostOrigin);

  const [isLoading, setIsLoading] = useState(false);

  const isDemo = !!hostOrigin && hostOrigin === DEMO_WEB_ORIGIN;

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
        return;
      }

      setIsLoading(true);

      const signDoc = data.payload.signDoc;
      const chainInfo = data.payload.chain_info;

      const isEthermintLike = isEthereumCompatible(
        chainInfo as unknown as ChainInfo,
      );

      const signatureRes = await makeCosmosSignature(
        hostOrigin,
        signDoc,
        isEthermintLike ? "keccak256" : "sha256",
        getIsAborted,
      );

      if (!signatureRes.success) {
        throw new Error("Sign output is null");
      }

      const ack: OpenModalAckPayload = {
        modal_type: "cosmos/make_signature",
        modal_id: modalId,
        type: "approve",
        data: {
          chain_type: "cosmos",
          sig_result: {
            signature: signatureRes.data,
            signed: signDoc,
          },
        },
      };

      closeModal(ack);
    } catch (error: any) {
      console.error("Error making cosmos arbitrary sig", error);
      const ack: OpenModalAckPayload = {
        modal_type: "cosmos/make_signature",
        modal_id: modalId,
        type: "error",
        error: error.toString(),
      };
      closeModal(ack);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    onReject,
    onApprove,
    isLoading,
    isDemo,
    theme,
  };
}

export interface UseCosmosArbitrarySigModalArgs {
  modalId: string;
  data: CosmosArbitrarySigData;
  getIsAborted: () => boolean;
}
