import { toHex, type Hex } from "viem";

import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";

export async function switchChain(
  this: EthEWallet,
  chainId: Hex | number,
): Promise<void> {
  const provider = this.cachedProvider;
  if (provider === null) {
    throw new Error("EthEWallet not initialized. Call initialize() first.");
  }

  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: toHex(chainId) }],
  });

  if (typeof chainId === "string") {
    this.activeChainId = parseInt(chainId, 16);
  } else {
    this.activeChainId = chainId;
  }
}
