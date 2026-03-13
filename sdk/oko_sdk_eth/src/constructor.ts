import type { OkoWalletInterface } from "@oko-wallet/oko-sdk-core";

import { lazyInit } from "./private/lazy_init";
import type {
  OkoEthWalletInterface,
  OkoEthWalletStaticInterface,
} from "./types";

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
