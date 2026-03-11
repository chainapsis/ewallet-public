import type {
  OkoWalletCoreEventHandler2,
  OkoWalletWebInterface,
} from "@oko-wallet-sdk-core/types";

export function on(
  this: OkoWalletWebInterface,
  handlerDef: OkoWalletCoreEventHandler2,
) {
  this.eventEmitter.on(handlerDef);
}
