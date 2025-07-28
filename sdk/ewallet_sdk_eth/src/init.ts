import type { KeplrEWallet } from "@keplr-ewallet/ewallet-sdk-core";

import { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";

export interface InitEthEWalletArgs {
  eWallet: KeplrEWallet | null;
  initialChainId?: string | number;
}

export async function initEthEWallet({
  eWallet,
  initialChainId,
}: InitEthEWalletArgs): Promise<EthEWallet | null> {
  if (eWallet === null) {
    return null;
  }

  const ethEWallet = new EthEWallet(eWallet);
  await ethEWallet.initialize(initialChainId);
  return ethEWallet;
}
