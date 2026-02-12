import { EventEmitter3 } from "./event";
import { lazyInit } from "./private/lazy_init";
import type {
  OkoWalletCoreEvent2,
  OkoWalletCoreEventHandler2,
  OkoWalletInterface,
  OkoWalletStaticInterface,
} from "./types";

export const OkoWallet = function (
  this: OkoWalletInterface,
  apiKey: string,
  iframe: HTMLIFrameElement,
  sdkEndpoint: string,
) {
  this.apiKey = apiKey;
  this.iframe = iframe;
  this.activePopupId = null;
  this.activePopupWindow = null;
  this.sdkEndpoint = sdkEndpoint;
  this.origin = window.location.origin;
  this.eventEmitter = new EventEmitter3<
    OkoWalletCoreEvent2,
    OkoWalletCoreEventHandler2
  >();
  this.state = {
    authType: null,
    email: null,
    publicKey: null,
    name: null,
  };
  this.waitUntilInitialized = lazyInit(this).then();
} as any as OkoWalletStaticInterface;
