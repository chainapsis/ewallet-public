/**
 * Address fetching with TanStack Query
 * Replaces the side-effect based address fetching in state/addresses.ts
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useEnabledChains } from "./use_chains";
import {
  selectCosmosInitialized,
  selectCosmosSDK,
  selectEthInitialized,
  selectEthSDK,
  selectSolInitialized,
  selectSolSDK,
  useSDKState,
} from "@oko-wallet-user-dashboard/state/sdk";
import type { ModularChainInfo } from "@oko-wallet-user-dashboard/types/chain";
import { isEvmOnlyChain } from "@oko-wallet-user-dashboard/utils/chain";

/**
 * Hook to get ETH address
 */
export function useEthAddress() {
  const okoEth = useSDKState(selectEthSDK);
  const isInitialized = useSDKState(selectEthInitialized);

  const query = useQuery({
    queryKey: ["address", "eth"],
    queryFn: async () => {
      if (!okoEth) {
        return null;
      }
      return okoEth.getAddress() ?? null;
    },
    enabled: !!okoEth && isInitialized,
    staleTime: Infinity, // Address doesn't change
    gcTime: Infinity,
  });

  return {
    address: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useSVMAddress() {
  const okoSvm = useSDKState(selectSolSDK);
  const isInitialized = useSDKState(selectSolInitialized);

  const query = useQuery({
    queryKey: ["address", "svm"],
    queryFn: async () => {
      if (!okoSvm) {
        return null;
      }
      return okoSvm.state.publicKey?.toBase58() ?? null;
    },
    enabled: !!okoSvm && isInitialized,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    address: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook to get address for a chain (auto-detects chain type)
 */
export function useChainAddress(chainInfo: ModularChainInfo | undefined) {
  const { address: ethAddress, isLoading: ethLoading } = useEthAddress();
  const { address: svmAddress, isLoading: svmLoading } = useSVMAddress();
  const { addresses: cosmosAddresses, isLoading: cosmosLoading } =
    useCosmosAddresses();

  if (!chainInfo) {
    return { address: undefined, isLoading: false };
  }

  if (chainInfo.svm) {
    return { address: svmAddress, isLoading: svmLoading };
  }

  if (isEvmOnlyChain(chainInfo)) {
    return { address: ethAddress, isLoading: ethLoading };
  }

  if (chainInfo.cosmos) {
    return {
      address: cosmosAddresses[chainInfo.chainId],
      isLoading: cosmosLoading,
    };
  }

  return { address: undefined, isLoading: false };
}

/**
 * Hook to fetch Cosmos addresses for all enabled Cosmos chains
 */
export function useCosmosAddresses() {
  const okoCosmos = useSDKState(selectCosmosSDK);
  const isInitialized = useSDKState(selectCosmosInitialized);
  const { chains: enabledChains } = useEnabledChains();

  const cosmosChainIds = useMemo(
    () =>
      enabledChains
        .filter((chain) => !!chain.cosmos)
        .map((chain) => chain.chainId),
    [enabledChains],
  );

  const query = useQuery({
    queryKey: ["addresses", "cosmos", cosmosChainIds.sort().join(",")],
    queryFn: async () => {
      if (!okoCosmos) {
        return {};
      }

      const results: Record<string, string | undefined> = {};

      await Promise.all(
        cosmosChainIds.map(async (chainId) => {
          try {
            const key = await okoCosmos.getKey(chainId);
            results[chainId] = key?.bech32Address;
          } catch (error) {
            console.error(
              `Failed to fetch cosmos address for ${chainId}:`,
              error,
            );
            results[chainId] = undefined;
          }
        }),
      );

      return results;
    },
    enabled: !!okoCosmos && isInitialized && cosmosChainIds.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    addresses: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error,
  };
}
