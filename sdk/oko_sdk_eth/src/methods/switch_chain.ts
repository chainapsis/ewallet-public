import { type Hex, toHex } from "viem";

import type { OkoEthWalletInterface } from "@oko-wallet-sdk-eth/types";

export async function switchChain(
  this: OkoEthWalletInterface,
  chainId: Hex | number,
): Promise<void> {
  const provider = await this.getEthereumProvider();

  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: toHex(chainId) }],
  });
}
