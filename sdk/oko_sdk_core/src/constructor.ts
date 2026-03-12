import { lazyInit } from "./private/lazy_init";
import type {
  OkoWalletCoreEvent2,
  OkoWalletCoreEventHandler2,
  OkoWalletWebInterface,
  OkoWalletStaticInterface,
} from "./types";
import { EventEmitter3 } from "./event";

export const OkoWallet = function (
  this: OkoWalletWebInterface,
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
} as unknown as OkoWalletStaticInterface;
