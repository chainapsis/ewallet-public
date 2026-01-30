import type { OkoSvmWalletInterface } from "@oko-wallet-sdk-svm/types";
import {
  makeSignature,
  SolanaRpcError,
  SolanaRpcErrorCode,
} from "./make_signature";

export async function signMessage(
  this: OkoSvmWalletInterface,
  message: Uint8Array,
): Promise<Uint8Array> {
  if (!this.connected || !this.publicKey) {
    throw new SolanaRpcError(
      SolanaRpcErrorCode.Internal,
      "Wallet not connected",
    );
  }

  const result = await makeSignature.call(this, {
    type: "sign_message",
    message,
  });

  if (result.type !== "sign_message") {
    throw new SolanaRpcError(
      SolanaRpcErrorCode.Internal,
      "Unexpected result type",
    );
  }

  return result.signature;
}
