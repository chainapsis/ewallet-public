import type {
  OkoCosmosWalletEventHandler2,
  OkoCosmosWalletInterface,
} from "@oko-wallet-sdk-cosmos/types";

export function off(
  this: OkoCosmosWalletInterface,
  handlerDef: OkoCosmosWalletEventHandler2,
) {
  this.eventEmitter.off(handlerDef);
}
