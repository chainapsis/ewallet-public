import { create } from "zustand";
import { combine } from "zustand/middleware";

import {
  type AssetMeta,
  postAssetMeta,
} from "@oko-wallet-user-dashboard/fetch/asset_meta";
import type { Currency } from "@oko-wallet-user-dashboard/types/chain";

type AssetMetaMap = Record<string, AssetMeta>;

function cacheKey(chainIdentifier: string, contractAddress: string): string {
  return `${chainIdentifier}_${contractAddress.toLowerCase()}`;
}

function metaToCurrency(meta: AssetMeta): Currency {
  const denom =
    meta.token_spec === "erc20" && !meta.denom.startsWith("erc20:")
      ? `erc20:${meta.denom}`
      : meta.denom;
  return {
    coinDenom: meta.symbol,
    coinMinimalDenom: denom,
    coinDecimals: meta.decimals,
    coinGeckoId: meta.coin_gecko_id ?? undefined,
    coinImageUrl: meta.img_url ?? undefined,
  };
}

function createRawFallbackCurrency(contractAddress: string): Currency {
  const addr = contractAddress.toLowerCase();
  return {
    coinDenom: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    coinMinimalDenom: `erc20:${addr}`,
    coinDecimals: 18,
  };
}

export const useAssetMetaStore = create(
  combine<
    { metaMap: AssetMetaMap },
    {
      resolveTokenMetadata: (
        tokens: { chainIdentifier: string; contractAddress: string }[],
      ) => Promise<Map<string, Currency>>;
      getCachedCoinGeckoIds: () => string[];
    }
  >({ metaMap: {} }, (set, get) => ({
    resolveTokenMetadata: async (tokens) => {
      const current = get().metaMap;
      const result = new Map<string, Currency>();
      const missing: {
        chain_identifier: string;
        minimal_denom: string;
        contractAddress: string;
      }[] = [];

      for (const { chainIdentifier, contractAddress } of tokens) {
        const key = cacheKey(chainIdentifier, contractAddress);
        const cached = current[key];
        if (cached) {
          result.set(contractAddress.toLowerCase(), metaToCurrency(cached));
        } else {
          missing.push({
            chain_identifier: chainIdentifier,
            minimal_denom: contractAddress.toLowerCase(),
            contractAddress,
          });
        }
      }

      if (missing.length > 0) {
        try {
          const fetched = await postAssetMeta({
            assets: missing.map(({ chain_identifier, minimal_denom }) => ({
              chain_identifier,
              minimal_denom,
            })),
          });

          const next: AssetMetaMap = { ...get().metaMap };
          const fetchedDenoms = new Set<string>();

          for (const meta of fetched) {
            next[`${meta.chain_identifier}_${meta.denom}`] = meta;
            result.set(meta.denom.toLowerCase(), metaToCurrency(meta));
            fetchedDenoms.add(meta.denom.toLowerCase());
          }

          for (const m of missing) {
            if (!fetchedDenoms.has(m.minimal_denom.toLowerCase())) {
              const addr = m.contractAddress.toLowerCase();
              if (!result.has(addr)) {
                result.set(addr, createRawFallbackCurrency(addr));
              }
            }
          }

          set({ metaMap: next });
        } catch (error) {
          console.error("Failed to fetch ERC20 token metadata:", error);
          for (const m of missing) {
            const addr = m.contractAddress.toLowerCase();
            if (!result.has(addr)) {
              result.set(addr, createRawFallbackCurrency(addr));
            }
          }
        }
      }

      return result;
    },

    getCachedCoinGeckoIds: () => {
      const ids: string[] = [];
      for (const meta of Object.values(get().metaMap)) {
        if (meta.coin_gecko_id) {
          ids.push(meta.coin_gecko_id);
        }
      }
      return ids;
    },
  })),
);
