import type {
  MakeEIP712SigData,
  MakeSigModalErrorAckPayload,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import { useEffect, useState } from "react";

import { isDemoOrSandboxOrigin } from "@oko-wallet-attached/requests/endpoints";
import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import { useSupportedEthChain } from "@oko-wallet-attached/web3/ethereum/hooks/use_supported_eth_chain";
import { makeEthereumEip712Signature } from "@oko-wallet-attached/web3/ethereum/sig";

export interface UseEthereumSigModalArgs {
  modalId: string;
  data: MakeEIP712SigData;
  getIsAborted: () => boolean;
}

export function useEIP712SigModal(args: UseEthereumSigModalArgs) {
  const { getIsAborted, modalId, data } = args;
  const { closeModal, setError } = useMemoryState();

  const hostOrigin = data.payload.origin;
  const storageKey = useMemoryState((state) => state.storageKey);
  const isMobileNative = useMemoryState((state) => state.isMobileNative);
  const mobileApiKey = useMemoryState((state) => state.apiKey);
  const theme = useAppState().getTheme(storageKey);

  const { isSupportedChain, isSupportChecked } = useSupportedEthChain({
    chainInfoForModal: data.payload.chain_info,
  });

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

      const signatureRes = await makeEthereumEip712Signature(
        storageKey,
        data.payload.data.serialized_typed_data,
        getIsAborted,
      );

      if (!signatureRes.success) {
        const err: MakeSigModalErrorAckPayload = {
          modal_type: "eth/make_signature",
          modal_id: modalId,
          type: "error",
          error: signatureRes.err,
        };
        setError(err);
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
    } catch (_error: any) {
      // const ack: OpenModalAckPayload = {
      //   modal_type: "make_signature",
      //   modal_id: modalId,
      //   type: "error",
      //   error: error.toString(),
      // };
      // closeModal(ack);
      // onError(error);
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
  };
}
