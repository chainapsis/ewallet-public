import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { useAssetMetaStore } from "@oko-wallet-attached/store/asset_meta";
import type { AssetMetaInput } from "@oko-wallet-attached/types/asset_meta";

const JUPITER_TOKEN_API_V2 = "https://api.jup.ag/tokens/v2";

export interface JupiterToken {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  icon: string | null;
  tags: string[];
  isVerified: boolean;
}

export type SvmTokenMetadataResult = {
  name?: string;
  symbol?: string;
  decimals?: number;
  icon?: string;
};

export interface UseGetSvmTokenMetadataProps {
  mintAddress?: string;
  chainId: string;
  options?: Partial<UseQueryOptions<SvmTokenMetadataResult>>;
}

async function fetchTokenMetadataFromJupiter(
  mintAddress: string,
): Promise<JupiterToken | null> {
  const url = `${JUPITER_TOKEN_API_V2}/search?query=${encodeURIComponent(mintAddress)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(
      `Jupiter API error: ${response.status} ${response.statusText}`,
    );
  }

  const tokens: JupiterToken[] = await response.json();

  const token = tokens.find(
    (t) => t.id.toLowerCase() === mintAddress.toLowerCase(),
  );

  return token ?? null;
}

async function fetchTokenMetadata(
  mintAddress: string,
  chainId: string,
): Promise<SvmTokenMetadataResult> {
  // Extract namespace from CAIP-2 for Asset Meta API (e.g., "solana:5eykt..." → "solana")
  const assetMetaChainId = chainId.split(":")[0];

  // 1. Try Asset Meta store
  const store = useAssetMetaStore.getState();
  const cachedMeta = store.findAssetMeta({
    chainIdentifier: assetMetaChainId,
    denom: mintAddress,
  });

  if (cachedMeta) {
    return {
      name: cachedMeta.coinDenom,
      symbol: cachedMeta.coinDenom,
      decimals: cachedMeta.coinDecimals,
      icon: cachedMeta.coinImageUrl,
    };
  }

  // 2. Try Asset Meta API
  try {
    const assets: AssetMetaInput[] = [
      {
        chain_identifier: assetMetaChainId,
        minimal_denom: mintAddress,
      },
    ];

    const currencies = await store.findOrUpdateAssetMeta({ assets });

    if (currencies.length > 0 && currencies[0]) {
      const currency = currencies[0];
      return {
        name: currency.coinDenom,
        symbol: currency.coinDenom,
        decimals: currency.coinDecimals,
        icon: currency.coinImageUrl,
      };
    }
  } catch (error) {
    console.warn(
      "Asset Meta API failed for SPL token, falling back to Jupiter:",
      error,
    );
  }

  // 3. Fallback to Jupiter API
  try {
    const jupiterToken = await fetchTokenMetadataFromJupiter(mintAddress);
    if (jupiterToken) {
      return {
        name: jupiterToken.name,
        symbol: jupiterToken.symbol,
        decimals: jupiterToken.decimals,
        icon: jupiterToken.icon ?? undefined,
      };
    }
  } catch (error) {
    console.error("Jupiter API also failed:", error);
  }

  // 4. Return empty result if all sources fail
  return {
    name: undefined,
    symbol: undefined,
    decimals: undefined,
    icon: undefined,
  };
}

export function useGetSvmTokenMetadata({
  mintAddress,
  chainId,
  options,
}: UseGetSvmTokenMetadataProps) {
  return useQuery({
    queryKey: ["svm-token-metadata", chainId, mintAddress],
    queryFn: async (): Promise<SvmTokenMetadataResult> => {
      if (!mintAddress) {
        return {
          name: undefined,
          symbol: undefined,
          decimals: undefined,
          icon: undefined,
        };
      }

      return await fetchTokenMetadata(mintAddress, chainId);
    },
    ...options,
    enabled: !!mintAddress && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
