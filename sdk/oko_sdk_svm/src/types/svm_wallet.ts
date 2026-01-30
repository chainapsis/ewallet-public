import type {
  OkoWalletInitArgs,
  OkoWalletInterface,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";
import type {
  Connection,
  PublicKey,
  SendOptions,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";

import type { SvmWalletEvent, SvmWalletEventHandler } from "./event";
import type {
  OkoSvmWalletInitError,
  LazyInitError,
} from "@oko-wallet-sdk-svm/errors";

export interface OkoSvmWalletState {
  publicKey: PublicKey | null;
  publicKeyRaw: string | null;
  chainId: string;
}

export type OkoSvmWalletInitArgs = OkoWalletInitArgs & {
  chain_id: string;
};

export interface OkoSvmWalletStaticInterface {
  new (okoWallet: OkoWalletInterface): undefined;
  init: (
    args: OkoSvmWalletInitArgs,
  ) => Result<OkoSvmWalletInterface, OkoSvmWalletInitError>;
}

export interface OkoSvmWalletInterface {
  state: OkoSvmWalletState;
  okoWallet: OkoWalletInterface;
  waitUntilInitialized: Promise<Result<OkoSvmWalletState, LazyInitError>>;

  publicKey: PublicKey | null;
  connecting: boolean;
  connected: boolean;

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: <T extends Transaction | VersionedTransaction>(
    transaction: T,
  ) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ) => Promise<T[]>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  sendTransaction: (
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendOptions,
  ) => Promise<TransactionSignature>;

  signAndSendTransaction: (
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendOptions,
  ) => Promise<{ signature: TransactionSignature }>;
  signAndSendAllTransactions: (
    transactions: (Transaction | VersionedTransaction)[],
    connection: Connection,
    options?: SendOptions,
  ) => Promise<{ signatures: TransactionSignature[] }>;

  on: <K extends SvmWalletEvent>(
    event: K,
    handler: SvmWalletEventHandler<K>,
  ) => void;
  off: <K extends SvmWalletEvent>(
    event: K,
    handler: SvmWalletEventHandler<K>,
  ) => void;
}
