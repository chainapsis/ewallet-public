/**
 * Chain data fetching with TanStack Query
 * Chain data lives here; user preferences live in Zustand (state/chains.ts)
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { KEPLR_API_ENDPOINT } from "@oko-wallet-user-dashboard/fetch";
import {
  DEFAULT_ENABLED_CHAINS,
  useChainStore,
} from "@oko-wallet-user-dashboard/state/chains";
import { useNativeChainsStore } from "@oko-wallet-user-dashboard/store/native_chains";
import type {
  CosmosChainInfo,
  ModularChainInfo,
} from "@oko-wallet-user-dashboard/types/chain";
import {
  getChainIdentifier,
  transformKeplrChain,
} from "@oko-wallet-user-dashboard/utils/chain";

interface KeplrChainsResponse {
  chains: CosmosChainInfo[];
}

async function fetchChains(): Promise<ModularChainInfo[]> {
  const response = await fetch(`${KEPLR_API_ENDPOINT}/v1/chains/all`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chains: ${response.statusText}`);
  }

  const data: KeplrChainsResponse = await response.json();
  return data.chains.map(transformKeplrChain);
}

/**
 * Hook to fetch chain list from Keplr API + non-Cosmos chains
 */
export function useChains() {
  const query = useQuery({
    queryKey: ["chains"],
    queryFn: fetchChains,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    chains: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to get enabled chains (chains + user preferences)
 */
export function useEnabledChains() {
  const { chains, isLoading } = useChains();

  // Select raw state to avoid infinite loop from getEnabledChainIds() returning new array
  const activeUserKey = useChainStore((state) => state.activeUserKey);
  const enabledChainsByUser = useChainStore(
    (state) => state.enabledChainsByUser,
  );

  const enabledChains = useMemo(() => {
    const userChainIds = activeUserKey
      ? enabledChainsByUser[activeUserKey]
      : undefined;
    // Use default only if no user preferences exist
    const enabledChainIds = userChainIds ?? [...DEFAULT_ENABLED_CHAINS];

    const enabledSet = new Set(enabledChainIds);
    return chains.filter((chain) =>
      enabledSet.has(getChainIdentifier(chain.chainId)),
    );
  }, [chains, activeUserKey, enabledChainsByUser]);

  return { chains: enabledChains, isLoading };
}

/**
 * Hook to get visible chains (for chain list UI, excludes hidden chains)
 */
export function useVisibleChains() {
  const { chains, isLoading } = useChains();

  const visibleChains = useMemo(() => {
    return chains.filter((chain) => !chain.cosmos?.hideInUI);
  }, [chains]);

  return { chains: visibleChains, isLoading };
}

/**
 * Hook to get a single chain by chainId
 */
export function useChain(chainId: string | undefined) {
  const { chains, isLoading } = useChains();

  const chain = useMemo(() => {
    if (!chainId) {
      return undefined;
    }
    const identifier = getChainIdentifier(chainId);
    return chains.find((c) => getChainIdentifier(c.chainId) === identifier);
  }, [chains, chainId]);

  return { chain, isLoading };
}

/**
 * Hook to get native chain identifiers from Keplr chain registry
 */
export function useGetNativeChainIdentifiers() {
  const nativeChainIdentifiers = useNativeChainsStore(
    (state) => state.chainIdentifiers,
  );
  const fetchNativeChains = useNativeChainsStore(
    (state) => state.fetchNativeChains,
  );

  useEffect(() => {
    if (nativeChainIdentifiers.length === 0) {
      fetchNativeChains();
    }
  }, [nativeChainIdentifiers.length, fetchNativeChains]);

  return nativeChainIdentifiers;
}
