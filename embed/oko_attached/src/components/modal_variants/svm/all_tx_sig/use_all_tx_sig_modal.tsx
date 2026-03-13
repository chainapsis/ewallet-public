import type { MakeSvmAllTxSignData } from "@oko-wallet/oko-sdk-core";
import { useState } from "react";

import {
  signMessageToHex,
  useSvmSignatureBase,
} from "../use_svm_signature_base";
import { base64ToUint8Array } from "@oko-wallet-attached/utils/base64";

export interface UseAllTxSigModalArgs {
  modalId: string;
  data: MakeSvmAllTxSignData;
  getIsAborted: () => boolean;
}

export function useAllTxSigModal(args: UseAllTxSigModalArgs) {
  const { modalId, data, getIsAborted } = args;
  const hostOrigin = data.payload.origin;

  const base = useSvmSignatureBase({ modalId, hostOrigin, getIsAborted });
  const [signingProgress, setSigningProgress] = useState(0);

  const txCount = data.payload.data.serialized_transactions.length;

  async function onApprove() {
    if (getIsAborted()) {
      return;
    }

    const ctx = base.prepareSigningContext();
    if (!ctx) {
      return;
    }

    base.setIsLoading(true);
    setSigningProgress(0);

    try {
      const signatures: string[] = [];
      const messagesToSign = data.payload.data.messages_to_sign;

      for (let i = 0; i < messagesToSign.length; i++) {
        if (getIsAborted()) {
          return;
        }

        const message = base64ToUint8Array(messagesToSign[i]);
        const result = await signMessageToHex(message, ctx);

        if (!result.success) {
          base.emitError(result.error);
          return;
        }

        signatures.push(result.signature);
        setSigningProgress(i + 1);
      }

      base.closeWithSignatures(signatures);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      base.emitUnknownError(errorMessage);
    } finally {
      base.setIsLoading(false);
    }
  }

  return {
    onReject: base.onReject,
    onApprove,
    isLoading: base.isLoading,
    isApproveEnabled: base.isApproveEnabled,
    isDemo: base.isDemo,
    theme: base.theme,
    data,
    txCount,
    signingProgress,
  };
}
