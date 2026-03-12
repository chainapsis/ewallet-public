import {
  EventEmitter3,
  type OkoWalletInterface,
} from "@oko-wallet/oko-sdk-core";

import type {
  OkoCosmosWalletInterface,
  OkoCosmosWalletStaticInterface,
  OkoCosmosWalletEvent2,
  OkoCosmosWalletEventHandler2,
} from "@oko-wallet-sdk-cosmos/types";
import { lazyInit } from "./private/lazy_init";

export const OkoCosmosWallet = function (
  this: OkoCosmosWalletInterface,
  okoWallet: OkoWalletInterface,
) {
  this.okoWallet = okoWallet;
  this.eventEmitter = new EventEmitter3<
    OkoCosmosWalletEvent2,
    OkoCosmosWalletEventHandler2
  >();
  this.state = {
    publicKey: null,
    publicKeyRaw: null,
  };
  this.waitUntilInitialized = lazyInit(this).then();
} as unknown as OkoCosmosWalletStaticInterface;
