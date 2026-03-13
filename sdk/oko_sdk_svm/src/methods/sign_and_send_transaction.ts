import type {
  Connection,
  SendOptions,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";

import { SolanaRpcError, SolanaRpcErrorCode } from "./make_signature";
import { signTransaction } from "./sign_transaction";
import type { OkoSvmWalletInterface } from "@oko-wallet-sdk-svm/types";

export async function signAndSendTransaction(
  this: OkoSvmWalletInterface,
  transaction: Transaction | VersionedTransaction,
  connection: Connection,
  options?: SendOptions,
): Promise<{ signature: TransactionSignature }> {
  if (!this.connected || !this.publicKey) {
    throw new SolanaRpcError(
      SolanaRpcErrorCode.Internal,
      "Wallet not connected",
    );
  }

  const signedTransaction = await signTransaction.call(this, transaction);

  const signature = await connection.sendRawTransaction(
    signedTransaction.serialize(),
    options,
  );

  return { signature };
}
