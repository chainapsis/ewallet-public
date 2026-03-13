import type { Currency } from "@keplr-wallet/types";
import { useQuery } from "@tanstack/react-query";

import { useAssetMetaStore } from "@oko-wallet-attached/store/asset_meta";
import type { AssetMetaInput } from "@oko-wallet-attached/types/asset_meta";

interface UseGetAssetMetaParams {
  chainIdentifier: string;
  minimalDenom: string;
  enabled?: boolean;
}

interface UseGetAssetMetaResult {
  data?: Currency;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useGetAssetMeta({
  chainIdentifier,
  minimalDenom,
  enabled = true,
}: UseGetAssetMetaParams): UseGetAssetMetaResult {
  const findAssetMeta = useAssetMetaStore((s) => s.findAssetMeta);
  const findOrUpdateAssetMeta = useAssetMetaStore(
    (s) => s.findOrUpdateAssetMeta,
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["assetMeta", chainIdentifier, minimalDenom],
    queryFn: async (): Promise<Currency | undefined> => {
      const localMeta = findAssetMeta({ chainIdentifier, denom: minimalDenom });
      if (localMeta) {
        return localMeta;
      }

      const assets: AssetMetaInput[] = [
        {
          chain_identifier: chainIdentifier,
          minimal_denom: minimalDenom,
        },
      ];

      const currencies = await findOrUpdateAssetMeta({ assets });
      return currencies[0];
    },
    enabled: enabled && !!chainIdentifier && !!minimalDenom,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

interface UseGetMultipleAssetMetaParams {
  assets: AssetMetaInput[];
  enabled?: boolean;
}
interface UseGetMultipleAssetMetaResult {
  data: Currency[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useGetMultipleAssetMeta({
  assets,
  enabled = true,
}: UseGetMultipleAssetMetaParams): UseGetMultipleAssetMetaResult {
  const findOrUpdateAssetMeta = useAssetMetaStore(
    (s) => s.findOrUpdateAssetMeta,
  );

  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["multipleAssetMeta", assets],
    queryFn: async (): Promise<Currency[]> => {
      return await findOrUpdateAssetMeta({ assets });
    },
    enabled: enabled && assets.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
