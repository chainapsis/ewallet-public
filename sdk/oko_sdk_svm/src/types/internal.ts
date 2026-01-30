import type { OkoSvmWalletInterface } from "./svm_wallet";
import type { SvmWalletEventEmitter } from "../emitter";

export interface OkoSvmWalletChainOptions {
  chain_id: string;
}

/**
 * Internal interface that extends OkoSvmWalletInterface with private emitter.
 * Used internally by SDK methods that need access to the event emitter.
 */
export interface OkoSvmWalletInternal extends OkoSvmWalletInterface {
  _emitter: SvmWalletEventEmitter;
  _accountsChangedHandler: (payload: { publicKey: string | null }) => void;
  _chainOptions: OkoSvmWalletChainOptions;
}
