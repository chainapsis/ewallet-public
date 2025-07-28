import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";
import type { Hex } from "viem";

export async function getPublicKey(this: EthEWallet): Promise<Hex> {
  const ret = await this.eWallet.getPublicKey();
  if (ret === null) {
    throw new Error("Invalid response from ewallet");
  }

  return `0x${ret}`;
}
