import type { Hex } from "viem";

import type { OkoEthWalletInterface } from "@oko-wallet-sdk-eth/types";

export async function getPublicKey(this: OkoEthWalletInterface): Promise<Hex> {
  console.log("[oko-eth] getPublicKey: start");

  if (this.state.publicKey !== null) {
    console.log("[oko-eth] getPublicKey: cached public key");

    return this.state.publicKey;
  }

  await this.waitUntilInitialized;

  console.log("[oko-eth] getPublicKey: getPublicKey from oko-eth wallet");

  const ret = await this.okoWallet.getPublicKey();
  if (ret === null) {
    throw new Error("Failed to fetch public key");
  }

  this.state.publicKey = `0x${ret}`;

  return `0x${ret}`;
}
