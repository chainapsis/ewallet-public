import type {
  OkoWalletCoreEventHandler2,
  OkoWalletWebInterface,
} from "@oko-wallet-sdk-core/types";

export function off(
  this: OkoWalletWebInterface,
  handlerDef: OkoWalletCoreEventHandler2,
) {
  this.eventEmitter.off(handlerDef);
}
