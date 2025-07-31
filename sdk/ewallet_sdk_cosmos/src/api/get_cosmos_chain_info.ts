import type { ChainInfo } from "@keplr-wallet/types";
import { type Result } from "@keplr-ewallet/stdlib-js";

import { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";

const CACHE_TIME = 1000 * 60 * 60 * 1;

export async function getCosmosChainInfo(
  this: CosmosEWallet,
): Promise<ChainInfo[]> {
  const isCacheExpired = Date.now() - this._cacheTime > CACHE_TIME;

  if (isCacheExpired || this._cosmosChainInfo === null) {
    const pubKey = await this.getPublicKey();
    const chainInfoRes = await fetchCosmosChainInfo();
    if (!chainInfoRes) {
      throw new Error("Failed to get chain registry response");
    }

    if (!chainInfoRes.success) {
      throw new Error(chainInfoRes.err);
    }

    this._cosmosChainInfo = chainInfoRes.data;

    const newMap = new Map<string, ChainInfo>();
    for (const chainInfo of this._cosmosChainInfo) {
      if (
        chainInfo.bech32Config?.bech32PrefixAccAddr &&
        chainInfo.bech32Config?.bech32PrefixAccAddr.length > 0
      ) {
        newMap.set(chainInfo.bech32Config?.bech32PrefixAccAddr, chainInfo);
      }
    }

    this._cacheTime = Date.now();
  }

  return this._cosmosChainInfo;
  // return { success: true, data: this._cosmosChainInfo };
}

export async function fetchCosmosChainInfo(): Promise<
  Result<ChainInfo[], string>
> {
  try {
    const response = await fetch(
      "https://keplr-chain-registry.vercel.app/api/chains",
    );
    const chains = (await response.json()) as ChainInfo[] | null;

    if (!chains) {
      return { success: false, err: "Failed to fetch chain info" };
    }

    return { success: true, data: chains };
  } catch (error) {
    console.error("Error fetching chain info:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return { success: false, err: errorMessage };
  }
}
