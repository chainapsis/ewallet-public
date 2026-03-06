import type { Currency } from "@keplr-wallet/types";
import { create } from "zustand";
import { combine } from "zustand/middleware";

import { postAssetMeta } from "@oko-wallet-attached/requests/asset_meta";
import type {
  AssetMeta,
  AssetMetaInput,
  AssetMetaParams,
} from "@oko-wallet-attached/types/asset_meta";
import { normalizeIBCDenom } from "@oko-wallet-attached/web3/cosmos/normalize_denom";

type AssetMetaMap = Record<string, AssetMeta>;

interface AssetMetaState {
  assetMetaMap: AssetMetaMap;
}

interface AssetMetaActions {
  getAllAssetMeta: () => AssetMeta[];

  findAssetMeta: (params: {
    chainIdentifier: string;
    denom: string;
  }) => Currency | undefined;

  updateAssetMeta: (params: AssetMetaParams) => Promise<AssetMetaMap>;

  findOrUpdateAssetMeta: (params: AssetMetaParams) => Promise<Currency[]>;

  setAssetMetaBatch: (items: AssetMeta[]) => void;
  clearAll: () => void;
}

const keyOf = (chainIdentifier: string, minimalDenom: string): string =>
  `${chainIdentifier}_${minimalDenom}`;

export const useAssetMetaStore = create(
  combine<AssetMetaState, AssetMetaActions>(
    {
      assetMetaMap: {},
    },
    (set, get) => ({
      getAllAssetMeta: () => Object.values(get().assetMetaMap),

      findAssetMeta: ({ chainIdentifier, denom }) => {
        const meta = get().assetMetaMap[keyOf(chainIdentifier, denom)];

        if (!meta) {
          return undefined;
        }

        const currency: Currency = {
          coinDenom: meta.symbol,
          coinMinimalDenom: meta.denom,
          coinDecimals: meta.decimals,
          coinGeckoId: meta.coin_gecko_id ?? undefined,
          coinImageUrl: meta.img_url ?? undefined,
        };
        return currency;
      },

      updateAssetMeta: async ({ assets }) => {
        try {
          const current = get().assetMetaMap;
          const missing = assets.filter(
            ({ chain_identifier, minimal_denom }) => {
              const key = keyOf(chain_identifier, minimal_denom);
              return current[key] === undefined;
            },
          );

          const next: AssetMetaMap = { ...current };
          if (missing.length > 0) {
            const fetched = await postAssetMeta({ assets: missing });
            for (const meta of fetched) {
              next[keyOf(meta.chain_identifier, meta.denom)] = meta;
            }
          }
          set({ assetMetaMap: next });
          return next;
        } catch (e) {
          console.error(e);
          return get().assetMetaMap;
        }
      },

      findOrUpdateAssetMeta: async ({ assets }) => {
        const map = get().assetMetaMap;
        const results: Currency[] = [];
        const missing: AssetMetaInput[] = [];

        for (const asset of assets) {
          const k = keyOf(asset.chain_identifier, asset.minimal_denom);
          const meta = map[k];
          if (meta) {
            results.push({
              coinDenom: meta.symbol,
              coinMinimalDenom: meta.denom,
              coinDecimals: meta.decimals,
              coinGeckoId: meta.coin_gecko_id ?? undefined,
              coinImageUrl: meta.img_url ?? undefined,
            });
          } else {
            missing.push({
              chain_identifier: asset.chain_identifier,
              minimal_denom: normalizeIBCDenom(asset.minimal_denom),
            });
          }
        }

        if (missing.length > 0) {
          try {
            const fetched = await postAssetMeta({ assets: missing });
            const next: AssetMetaMap = { ...get().assetMetaMap };

            for (const meta of fetched) {
              next[keyOf(meta.chain_identifier, meta.denom)] = meta;
              results.push({
                coinDenom: meta.symbol,
                coinMinimalDenom: meta.denom,
                coinDecimals: meta.decimals,
                coinGeckoId: meta.coin_gecko_id ?? undefined,
                coinImageUrl: meta.img_url ?? undefined,
              });
            }
            set({ assetMetaMap: next });
          } catch (error) {
            console.error("Failed to fetch asset meta:", error);
          }
        }

        return results;
      },

      setAssetMetaBatch: (items) => {
        const next: AssetMetaMap = { ...get().assetMetaMap };
        for (const meta of items) {
          next[keyOf(meta.chain_identifier, meta.denom)] = meta;
        }
        set({ assetMetaMap: next });
      },

      clearAll: () => set({ assetMetaMap: {} }),
    }),
  ),
);
