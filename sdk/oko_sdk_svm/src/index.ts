export { OkoSvmWallet } from "./svm_wallet";
export { SvmWalletEventEmitter } from "./emitter";

export type {
  OkoSvmWalletState,
  OkoSvmWalletInitArgs,
  OkoSvmWalletStaticInterface,
  OkoSvmWalletInterface,
  SvmSignParams,
  SvmSignResult,
  SvmSignTransactionParams,
  SvmSignAllTransactionsParams,
  SvmSignMessageParams,
  SvmSignTransactionResult,
  SvmSignAllTransactionsResult,
  SvmSignMessageResult,
  SvmWalletEvent,
  SvmWalletEventMap,
  SvmWalletEventHandler,
} from "./types";

export type {
  OkoSvmWalletInitError,
  LazyInitError,
  OkoSvmWalletError,
} from "./errors";

// Wallet Standard
export {
  registerWalletStandard,
  OkoStandardWallet,
  OKO_WALLET_NAME,
  OkoSvmWalletAccount,
  buildSignInMessage,
  createSignInFeature,
} from "./wallet-standard";

export type { WalletStandardConfig } from "./wallet-standard";
