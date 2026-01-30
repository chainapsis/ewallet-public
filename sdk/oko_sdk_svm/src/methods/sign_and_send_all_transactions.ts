import type {
  Connection,
  SendOptions,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";

import type { OkoSvmWalletInterface } from "@oko-wallet-sdk-svm/types";
import { signAllTransactions } from "./sign_all_transactions";
import { SolanaRpcError, SolanaRpcErrorCode } from "./make_signature";

export async function signAndSendAllTransactions(
  this: OkoSvmWalletInterface,
  transactions: (Transaction | VersionedTransaction)[],
  connection: Connection,
  options?: SendOptions,
): Promise<{ signatures: TransactionSignature[] }> {
  if (!this.connected || !this.publicKey) {
    throw new SolanaRpcError(
      SolanaRpcErrorCode.Internal,
      "Wallet not connected",
    );
  }

  const signedTransactions = await signAllTransactions.call(this, transactions);

  const signatures: TransactionSignature[] = [];

  for (const signedTx of signedTransactions) {
    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      options,
    );
    signatures.push(signature);
  }

  return { signatures };
}
