import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";
import { isHex, type Hex } from "viem";

export async function getPublicKey(this: EthEWallet): Promise<Hex> {
  if (this.publicKey !== null) {
    return this.publicKey;
  }

  const ret = await this.eWallet.getPublicKey();
  if (ret === null) {
    throw new Error("Invalid response from ewallet");
  }

  this.publicKey = `0x${ret}`;

  return `0x${ret}`;
}
