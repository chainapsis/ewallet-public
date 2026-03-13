import type {
  OkoCosmosWalletEventHandler2,
  OkoCosmosWalletInterface,
} from "@oko-wallet-sdk-cosmos/types";

export function on(
  this: OkoCosmosWalletInterface,
  handlerDef: OkoCosmosWalletEventHandler2,
) {
  this.eventEmitter.on(handlerDef);
}
