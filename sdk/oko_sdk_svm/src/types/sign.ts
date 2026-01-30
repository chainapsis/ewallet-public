import type { Transaction, VersionedTransaction } from "@solana/web3.js";

export type SvmSignTransactionParams = {
  type: "sign_transaction";
  transaction: Transaction | VersionedTransaction;
};

export type SvmSignAllTransactionsParams = {
  type: "sign_all_transactions";
  transactions: (Transaction | VersionedTransaction)[];
};

export type SvmSignMessageParams = {
  type: "sign_message";
  message: Uint8Array;
};

export type SvmSignParams =
  | SvmSignTransactionParams
  | SvmSignAllTransactionsParams
  | SvmSignMessageParams;

export type SvmSignTransactionResult = {
  type: "sign_transaction";
  signedTransaction: Transaction | VersionedTransaction;
};

export type SvmSignAllTransactionsResult = {
  type: "sign_all_transactions";
  signedTransactions: (Transaction | VersionedTransaction)[];
};

export type SvmSignMessageResult = {
  type: "sign_message";
  signature: Uint8Array;
};

export type SvmSignResult =
  | SvmSignTransactionResult
  | SvmSignAllTransactionsResult
  | SvmSignMessageResult;
