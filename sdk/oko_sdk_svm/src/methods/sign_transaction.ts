import type { Transaction, VersionedTransaction } from "@solana/web3.js";

import type { OkoSvmWalletInterface } from "@oko-wallet-sdk-svm/types";
import {
  makeSignature,
  SolanaRpcError,
  SolanaRpcErrorCode,
} from "./make_signature";

export async function signTransaction<
  T extends Transaction | VersionedTransaction,
>(this: OkoSvmWalletInterface, transaction: T): Promise<T> {
  if (!this.connected || !this.publicKey) {
    throw new SolanaRpcError(
      SolanaRpcErrorCode.Internal,
      "Wallet not connected",
    );
  }

  const result = await makeSignature.call(this, {
    type: "sign_transaction",
    transaction,
  });

  if (result.type !== "sign_transaction") {
    throw new SolanaRpcError(
      SolanaRpcErrorCode.Internal,
      "Unexpected result type",
    );
  }

  return result.signedTransaction as T;
}
