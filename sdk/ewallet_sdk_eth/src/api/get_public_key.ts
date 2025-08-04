import { type Hex } from "viem";

import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";
import { standardError } from "@keplr-ewallet-sdk-eth/errors";

export async function getPublicKey(this: EthEWallet): Promise<Hex> {
  if (this.publicKey !== null) {
    return this.publicKey;
  }

  const ret = await this.eWallet.getPublicKey();
  if (ret === null) {
    throw standardError.ethEWallet.publicKeyFetchFailed({});
  }

  this.publicKey = `0x${ret}`;

  return `0x${ret}`;
}
