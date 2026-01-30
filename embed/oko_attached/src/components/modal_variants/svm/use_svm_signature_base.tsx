import { useState } from "react";
import type {
  MakeSvmSigError,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";

import { useAppState } from "@oko-wallet-attached/store/app";
import { useMemoryState } from "@oko-wallet-attached/store/memory";
import { DEMO_WEB_ORIGIN } from "@oko-wallet-attached/requests/endpoints";
import {
  makeSignOutputEd25519,
  type KeyPackageEd25519,
} from "@oko-wallet-attached/crypto/sign_ed25519";
import {
  teddsaKeygenFromHex,
  extractKeyPackageHex,
} from "@oko-wallet-attached/crypto/keygen_ed25519";

export interface UseSvmSignatureBaseArgs {
  modalId: string;
  hostOrigin: string;
  getIsAborted: () => boolean;
}

export interface SigningContext {
  keyPackage: KeyPackageEd25519;
  apiKey: string;
  authToken: string;
  getIsAborted: () => boolean;
}

export type SigningResult =
  | { success: true; signature: string }
  | { success: true; signatures: string[] }
  | { success: false };

/**
 * Sign a single message and return hex-encoded signature
 */
export async function signMessageToHex(
  message: Uint8Array,
  ctx: SigningContext,
): Promise<
  | { success: true; signature: string }
  | { success: false; error: MakeSvmSigError }
> {
  const signatureRes = await makeSignOutputEd25519(
    message,
    ctx.keyPackage,
    ctx.apiKey,
    ctx.authToken,
    ctx.getIsAborted,
  );

  if (!signatureRes.success) {
    return { success: false, error: signatureRes.err };
  }

  const signatureHex = Array.from(signatureRes.data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { success: true, signature: signatureHex };
}

export function useSvmSignatureBase(args: UseSvmSignatureBaseArgs) {
  const { modalId, hostOrigin, getIsAborted } = args;
  const { closeModal, setError } = useMemoryState();

  const theme = useAppState().getTheme(hostOrigin);
  const apiKey = useAppState().getApiKey(hostOrigin);
  const authToken = useAppState().getAuthToken(hostOrigin);
  const walletEd25519 = useAppState().getWalletEd25519(hostOrigin);
  const keyPackageEd25519 = useAppState().getKeyPackageEd25519(hostOrigin);

  const [isLoading, setIsLoading] = useState(false);

  const isDemo = !!hostOrigin && hostOrigin === DEMO_WEB_ORIGIN;
  const isApproveEnabled =
    !!walletEd25519 && !!keyPackageEd25519 && !!apiKey && !!authToken;

  function onReject() {
    const ack: OpenModalAckPayload = {
      modal_type: "svm/make_signature",
      modal_id: modalId,
      type: "reject",
    };
    closeModal(ack);
  }

  function emitError(error: MakeSvmSigError) {
    setError({
      modal_type: "svm/make_signature",
      modal_id: modalId,
      type: "error",
      error,
    });
  }

  function emitUnknownError(message: string) {
    emitError({ type: "unknown_error", error: message });
  }

  function closeWithSignature(signature: string) {
    const ack: OpenModalAckPayload = {
      modal_type: "svm/make_signature",
      modal_id: modalId,
      type: "approve",
      data: {
        chain_type: "svm",
        sig_result: { type: "signature", signature },
      },
    };
    closeModal(ack);
  }

  function closeWithSignatures(signatures: string[]) {
    const ack: OpenModalAckPayload = {
      modal_type: "svm/make_signature",
      modal_id: modalId,
      type: "approve",
      data: {
        chain_type: "svm",
        sig_result: { type: "signatures", signatures },
      },
    };
    closeModal(ack);
  }

  /**
   * Prepare signing context. Returns null if validation fails.
   */
  function prepareSigningContext(): SigningContext | null {
    if (!walletEd25519 || !keyPackageEd25519 || !apiKey || !authToken) {
      emitUnknownError(
        "Missing ed25519 wallet, key package, API key, or auth token",
      );
      return null;
    }

    const keyPackageHex = extractKeyPackageHex(
      keyPackageEd25519,
      walletEd25519.publicKeyPackage,
      walletEd25519.publicKey,
    );
    const keyPackageRes = teddsaKeygenFromHex(keyPackageHex);
    if (!keyPackageRes.success) {
      emitUnknownError(keyPackageRes.err);
      return null;
    }

    return {
      keyPackage: {
        keyPackage: keyPackageRes.data.key_package,
        publicKeyPackage: keyPackageRes.data.public_key_package,
        identifier: keyPackageRes.data.identifier,
      },
      apiKey,
      authToken,
      getIsAborted,
    };
  }

  return {
    // State
    isLoading,
    setIsLoading,
    isApproveEnabled,
    isDemo,
    theme,

    // Actions
    onReject,
    emitError,
    emitUnknownError,
    closeWithSignature,
    closeWithSignatures,

    // Signing
    prepareSigningContext,
    getIsAborted,
  };
}
