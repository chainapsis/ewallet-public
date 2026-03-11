import type { OkoWalletInterface } from "@oko-wallet/oko-sdk-core";

import type {
  OkoEthWalletInterface,
  OkoEthWalletStaticInterface,
} from "./types";
import { lazyInit } from "./private/lazy_init";

export const OkoEthWallet = function (
  this: OkoEthWalletInterface,
  okoWallet: OkoWalletInterface,
) {
  this.okoWallet = okoWallet;
  this.provider = null;
  this.state = {
    publicKey: null,
    publicKeyRaw: null,
    address: null,
  };
  this.waitUntilInitialized = lazyInit(this).then();
} as unknown as OkoEthWalletStaticInterface;
