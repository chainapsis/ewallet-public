import { registerWallet } from "@wallet-standard/wallet";

import type { WalletStandardConfig } from "./chains";
import { OkoStandardWallet } from "./wallet";
import type { OkoSvmWalletInterface } from "@oko-wallet-sdk-svm/types";

const state = { isRegistered: false };

export function registerWalletStandard(
  wallet: OkoSvmWalletInterface,
  configs: WalletStandardConfig[],
): void {
  if (state.isRegistered) {
    console.warn(
      "[oko-svm] Wallet-standard already registered.",
    );
    return;
  }

  const standardWallet = new OkoStandardWallet(wallet, configs);
  registerWallet(standardWallet);

  state.isRegistered = true;
}
