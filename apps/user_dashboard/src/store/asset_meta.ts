import { create } from "zustand";
import { combine } from "zustand/middleware";

import {
  type AssetMeta,
  postAssetMeta,
} from "@oko-wallet-user-dashboard/fetch/asset_meta";
import type { Currency } from "@oko-wallet-user-dashboard/types/chain";

type AssetMetaMap = Record<string, AssetMeta>;

function normalizeDenom(denom: string): string {
  if (denom.startsWith("ibc/") || denom.startsWith("IBC/")) {
    return "ibc/" + denom.slice(4).toUpperCase();
  }
  return denom.toLowerCase();
}

function cacheKey(chainIdentifier: string, denom: string): string {
  return `${chainIdentifier}_${normalizeDenom(denom)}`;
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

function createFallbackCurrency(denom: string): Currency {
  if (denom.startsWith("0x")) {
    const addr = denom.toLowerCase();
    return {
      coinDenom: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
      coinMinimalDenom: `erc20:${addr}`,
      coinDecimals: 18,
    };
  }
  const display =
    denom.length > 16
      ? `${denom.slice(0, 10)}...${denom.slice(-4)}`
      : denom;
  return {
    coinDenom: display,
    coinMinimalDenom: denom,
    coinDecimals: 6,
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
        normalizedKey: string;
      }[] = [];

      for (const { chainIdentifier, contractAddress } of tokens) {
        const normalized = normalizeDenom(contractAddress);
        const key = cacheKey(chainIdentifier, contractAddress);
        const cached = current[key];
        if (cached) {
          result.set(normalized, metaToCurrency(cached));
        } else {
          missing.push({
            chain_identifier: chainIdentifier,
            minimal_denom: normalized,
            normalizedKey: normalized,
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
          const fetchedKeys = new Set<string>();

          for (const meta of fetched) {
            const normalized = normalizeDenom(meta.denom);
            next[`${meta.chain_identifier}_${normalized}`] = meta;
            result.set(normalized, metaToCurrency(meta));
            fetchedKeys.add(normalized);
          }

          for (const m of missing) {
            if (!fetchedKeys.has(m.normalizedKey)) {
              if (!result.has(m.normalizedKey)) {
                result.set(
                  m.normalizedKey,
                  createFallbackCurrency(m.normalizedKey),
                );
              }
            }
          }

          set({ metaMap: next });
        } catch (error) {
          console.error("Failed to fetch token metadata:", error);
          for (const m of missing) {
            if (!result.has(m.normalizedKey)) {
              result.set(
                m.normalizedKey,
                createFallbackCurrency(m.normalizedKey),
              );
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
