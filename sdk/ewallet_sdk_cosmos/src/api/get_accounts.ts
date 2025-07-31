import type { AccountData } from "@cosmjs/amino";

import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";
import {
  isEthereumCompatible,
  getEthAddress,
  getCosmosAddress,
  getBech32Address,
} from "@keplr-ewallet-sdk-cosmos/utils/address";

export async function getAccounts(
  this: CosmosEWallet,
): Promise<readonly AccountData[]> {
  try {
    const pubKey = await this.getPublicKey();
    const chainInfoList = await this.getCosmosChainInfo();

    const accounts: AccountData[] = [];
    for (const chainInfo of chainInfoList) {
      const prefix = chainInfo.bech32Config?.bech32PrefixAccAddr;
      if (!prefix) continue;

      const hasEthereumSupport = isEthereumCompatible(chainInfo);
      const address = hasEthereumSupport
        ? getEthAddress(pubKey)
        : getCosmosAddress(pubKey);
      const bech32Address = getBech32Address(address, prefix);

      accounts.push({
        address: bech32Address,
        algo: "secp256k1",
        pubkey: pubKey,
      });
    }

    return accounts;
  } catch (error) {
    console.error("Failed to get accounts:", error);
    return [];
  }
}
