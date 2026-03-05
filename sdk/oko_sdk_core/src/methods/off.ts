import type {
  OkoWalletCoreEventHandler2,
  OkoWalletInterface,
} from "@oko-wallet-sdk-core/types";

export function off(
  this: OkoWalletInterface,
  handlerDef: OkoWalletCoreEventHandler2,
) {
  this.eventEmitter.off(handlerDef);
}
