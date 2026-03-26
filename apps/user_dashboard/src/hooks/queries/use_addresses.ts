/**
 * Address fetching with TanStack Query
 * Replaces the side-effect based address fetching in state/addresses.ts
 */

import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useOkoEth } from "@oko-wallet/oko-sdk-react/eth";
import { useOkoSvm } from "@oko-wallet/oko-sdk-react/svm";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useEnabledChains } from "./use_chains";
import type { ModularChainInfo } from "@oko-wallet-user-dashboard/types/chain";
import { isEvmOnlyChain } from "@oko-wallet-user-dashboard/utils/chain";

/**
 * Hook to get ETH address
 */
export function useEthAddress() {
  const { ethWallet: okoEth, isReady: isInitialized } = useOkoEth();

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
  const { svmWallet: okoSvm, isReady: isInitialized } = useOkoSvm();

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
 * Hook to get a single Cosmos chain address (works for non-enabled chains)
 */
export function useCosmosAddress(chainId: string | undefined) {
  const { cosmosWallet: okoCosmos, isReady: isInitialized } = useOkoCosmos();

  const query = useQuery({
    queryKey: ["address", "cosmos", chainId],
    queryFn: async () => {
      if (!okoCosmos || !chainId) {
        return null;
      }
      const key = await okoCosmos.getKey(chainId);
      return key?.bech32Address ?? null;
    },
    enabled: !!okoCosmos && isInitialized && !!chainId,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    address: query.data ?? undefined,
    isLoading: query.isLoading,
  };
}

/**
 * Hook to get address for a chain (auto-detects chain type).
 * Works for both enabled and non-enabled chains.
 */
export function useChainAddress(chainInfo: ModularChainInfo | undefined) {
  const { address: ethAddress, isLoading: ethLoading } = useEthAddress();
  const { address: svmAddress, isLoading: svmLoading } = useSVMAddress();
  const { address: cosmosAddress, isLoading: cosmosLoading } = useCosmosAddress(
    chainInfo?.cosmos ? chainInfo.chainId : undefined,
  );

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
    return { address: cosmosAddress, isLoading: cosmosLoading };
  }

  return { address: undefined, isLoading: false };
}

/**
 * Hook to fetch Cosmos addresses for all enabled Cosmos chains
 */
export function useCosmosAddresses() {
  const { cosmosWallet: okoCosmos, isReady: isInitialized } = useOkoCosmos();
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
