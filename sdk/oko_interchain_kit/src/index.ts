import { initializeOkoCosmosWallet } from "./init";
import { OkoWallet } from "./oko-wallet";
import { okoWalletInfo } from "./registry";
import type { OkoWalletOptions } from "./types";

export const makeOkoWallet = (options: OkoWalletOptions): OkoWallet => {
  if (typeof window === "undefined") {
    throw new Error(
      "Oko Wallet can only be initialized in browser environment",
    );
  }

  const okoClient = initializeOkoCosmosWallet(options);
  return new OkoWallet(okoWalletInfo, okoClient);
};

export { okoWalletInfo } from "./registry";
export type { OkoWalletOptions } from "./types";
