import type { OkoWalletWebInterface } from "./types";

declare global {
  interface Window {
    __oko: OkoWalletWebInterface | null | undefined;
    __oko_locked: boolean;
    __oko_ev: ((ev: MessageEvent) => void) | null | undefined;
  }
}

export {};
