import type {
  MakeArbitrarySigData,
  MakeSigModalErrorAckPayload,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import { useEffect, useState } from "react";

import { hasOnChainSchema } from "@oko-wallet-attached/components/modal_variants/eth/arbitrary_sig/on_chain";
import { isDemoOrSandboxOrigin } from "@oko-wallet-attached/requests/endpoints";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import { useSupportedEthChain } from "@oko-wallet-attached/web3/ethereum/hooks/use_supported_eth_chain";
import { makeEthereumArbitraryMessageSignature } from "@oko-wallet-attached/web3/ethereum/sig";

export interface UseEthereumSigModalArgs {
  modalId: string;
  data: MakeArbitrarySigData;
  getIsAborted: () => boolean;
}

export function useArbitrarySigModal(args: UseEthereumSigModalArgs) {
  const { getIsAborted, modalId, data } = args;
  const { closeModal, setError } = useMemoryState();

  const { isSupportedChain, isSupportChecked } = useSupportedEthChain({
    chainInfoForModal: data.payload.chain_info,
  });

  const hostOrigin = data.payload.origin;
  const storageKey = useMemoryState((state) => state.storageKey);
  const isMobileNative = useMemoryState((state) => state.isMobileNative);
  const mobileApiKey = useMemoryState((state) => state.apiKey);
  const theme = useAppState().getTheme(storageKey);

  const [isLoading, setIsLoading] = useState(false);
  const [isApproveEnabled, setIsApproveEnabled] = useState(false);

  const isDemo = isDemoOrSandboxOrigin(hostOrigin, {
    isMobileNative,
    apiKey: mobileApiKey,
  });

  useEffect(() => {
    if (!isSupportChecked) {
      return;
    }

    if (isSupportedChain) {
      setIsApproveEnabled(true);
    } else {
      setIsApproveEnabled(false);
      setError({
        modal_type: "eth/make_signature",
        modal_id: modalId,
        type: "error",
        error: {
          type: "chain_not_supported",
          data: {
            chain_id: data.payload.chain_info.chain_id,
            chain_name: data.payload.chain_info.chain_name,
            chain_symbol_image_url:
              data.payload.chain_info.chain_symbol_image_url,
          },
        },
      });
    }
  }, [isSupportedChain, isSupportChecked]);

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

      const signatureRes = await makeEthereumArbitraryMessageSignature(
        storageKey,
        data.payload.data.message,
        getIsAborted,
      );

      if (!signatureRes.success) {
        console.log("make eth arbitrary sig fail", signatureRes.err);

        const err: MakeSigModalErrorAckPayload = {
          modal_type: "eth/make_signature",
          modal_id: modalId,
          type: "error",
          error: signatureRes.err,
        };
        setError(err);
        closeModal(err);

        return;
      }

      const ack: OpenModalAckPayload = {
        modal_type: "eth/make_signature",
        modal_id: modalId,
        type: "approve",
        data: {
          chain_type: "eth",
          sig_result: {
            type: "signature",
            signature: signatureRes.data,
          },
        },
      };

      closeModal(ack);
    } catch (error: any) {
      const err: MakeSigModalErrorAckPayload = {
        modal_type: "eth/make_signature",
        modal_id: modalId,
        type: "error",
        error: {
          type: "unknown_error",
          error,
        },
      };
      setError(err);
      closeModal(err);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    onReject,
    onApprove,
    isLoading,
    isApproveEnabled,
    isDemo,
    theme,
    hasOnChainSchema: hasOnChainSchema(data.payload.data.message),
  };
}
