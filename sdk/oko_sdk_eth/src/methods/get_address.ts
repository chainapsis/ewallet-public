import { type Hex, isAddress } from "viem";

import type { OkoEthWalletInterface } from "@oko-wallet-sdk-eth/types";
import { publicKeyToEthereumAddress } from "@oko-wallet-sdk-eth/utils";

export async function getAddress(this: OkoEthWalletInterface): Promise<Hex> {
  if (this.state.address !== null) {
    return this.state.address;
  }

  await this.okoWallet.waitUntilInitialized;

  const publicKey = await this.getPublicKey();
  const address = publicKeyToEthereumAddress(publicKey);
  if (!isAddress(address)) {
    throw new Error("Invalid address");
  }

  this.state.address = address;

  return address;
}
