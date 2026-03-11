interface OsmosisAsset {
  symbol: string;
  coinMinimalDenom: string;
  decimals: number;
  coingeckoId?: string;
  logoURIs?: {
    svg?: string;
    png?: string;
  };
}

interface OsmosisAssetList {
  assets: OsmosisAsset[];
}

export interface OsmosisAssetSymbolMap {
  /** Maps IBC denom (e.g. ibc/D189...) → display symbol (e.g. USDC.eth.axl) */
  byDenom: Map<string, OsmosisAsset>;
}

let cached: OsmosisAssetSymbolMap | null = null;
let fetchPromise: Promise<OsmosisAssetSymbolMap> | null = null;

const OSMOSIS_ASSET_LIST_URL =
  "https://raw.githubusercontent.com/osmosis-labs/assetlists/main/osmosis-1/generated/frontend/assetlist.json";

export async function fetchOsmosisAssetList(): Promise<OsmosisAssetSymbolMap> {
  if (cached) {
    return cached;
  }
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    const response = await fetch(OSMOSIS_ASSET_LIST_URL);
    if (!response.ok) {
      throw new Error(
        `Osmosis asset list fetch failed: ${response.statusText}`,
      );
    }
    const data: OsmosisAssetList = await response.json();
    const byDenom = new Map<string, OsmosisAsset>();
    for (const asset of data.assets) {
      if (asset.coinMinimalDenom) {
        byDenom.set(asset.coinMinimalDenom, asset);
      }
    }
    cached = { byDenom };
    fetchPromise = null;
    return cached;
  })();

  return fetchPromise;
}
