import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";
import { isAddress, type Hex } from "viem";

import { publicKeyToEthereumAddress } from "@keplr-ewallet-sdk-eth/utils";

export async function getAddress(this: EthEWallet): Promise<Hex> {
  if (this.address !== null) {
    return this.address;
  }

  const publicKey = await this.getPublicKey();
  const address = publicKeyToEthereumAddress(publicKey);
  if (!isAddress(address)) {
    throw new Error("Invalid address");
  }

  this.address = address;

  return address;
}
