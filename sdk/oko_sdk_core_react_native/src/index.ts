import "react-native-get-random-values";
import { Buffer } from "buffer";

if (typeof globalThis.Buffer === "undefined") {
  (globalThis as Record<string, unknown>).Buffer = Buffer;
}

export { OkoWalletProvider } from "./OkoWalletProvider";
export { OkoWalletRN } from "./OkoWalletRN";
export * from "./types";
export { useOkoWallet } from "./useOkoWallet";
