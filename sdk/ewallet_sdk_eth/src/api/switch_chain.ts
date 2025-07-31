import { toHex, type Hex } from "viem";

import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";

export async function switchChain(
  this: EthEWallet,
  chainId: Hex | number,
): Promise<void> {
  const provider = await this.getEthereumProvider();
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: toHex(chainId) }],
  });
}
