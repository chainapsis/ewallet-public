import "react-native-get-random-values";
import { Buffer } from "buffer";

if (typeof globalThis.Buffer === "undefined") {
  (globalThis as Record<string, unknown>).Buffer = Buffer;
}

// Polyfill Event for @wallet-standard/wallet compatibility.
// RegisterWalletEvent extends Event at module scope; without this
// polyfill, importing @oko-wallet/oko-sdk-svm crashes in React Native.
if (typeof globalThis.Event === "undefined") {
  (globalThis as Record<string, unknown>).Event = class Event {
    readonly type: string;
    readonly bubbles: boolean;
    readonly cancelable: boolean;
    readonly composed: boolean;

    constructor(
      type: string,
      init?: { bubbles?: boolean; cancelable?: boolean; composed?: boolean },
    ) {
      this.type = type;
      this.bubbles = init?.bubbles ?? false;
      this.cancelable = init?.cancelable ?? false;
      this.composed = init?.composed ?? false;
    }

    preventDefault() {}
    stopPropagation() {}
    stopImmediatePropagation() {}
  };
}

export { OkoWalletProvider } from "./OkoWalletProvider";
export { OkoWalletRN } from "./OkoWalletRN";
export * from "./types";
export { useOkoWallet } from "./useOkoWallet";
