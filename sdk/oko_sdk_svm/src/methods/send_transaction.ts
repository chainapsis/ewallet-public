import type {
  Connection,
  SendOptions,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";

import type { OkoSvmWalletInterface } from "@oko-wallet-sdk-svm/types";
import { signTransaction } from "./sign_transaction";
import { SolanaRpcError, SolanaRpcErrorCode } from "./make_signature";

export async function sendTransaction(
  this: OkoSvmWalletInterface,
  transaction: Transaction | VersionedTransaction,
  connection: Connection,
  options?: SendOptions,
): Promise<TransactionSignature> {
  if (!this.connected || !this.publicKey) {
    throw new SolanaRpcError(
      SolanaRpcErrorCode.Internal,
      "Wallet not connected",
    );
  }

  // Sign the transaction
  const signedTransaction = await signTransaction.call(this, transaction);

  // Send the signed transaction
  const signature = await connection.sendRawTransaction(
    signedTransaction.serialize(),
    options,
  );

  return signature;
}
