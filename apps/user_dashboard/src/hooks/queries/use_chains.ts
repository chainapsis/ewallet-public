/**
 * Chain data fetching with TanStack Query
 * Chain data lives here; user preferences live in Zustand (state/chains.ts)
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  SOLANA_DEVNET,
  SOLANA_MAINNET,
  SOLANA_TESTNET,
} from "@oko-wallet-user-dashboard/config/solana";
import { KEPLR_API_ENDPOINT } from "@oko-wallet-user-dashboard/fetch";
import {
  DEFAULT_ENABLED_CHAINS,
  getChainIdentifier,
  transformKeplrChain,
  useChainStore,
} from "@oko-wallet-user-dashboard/state/chains";
import type {
  CosmosChainInfo,
  ModularChainInfo,
} from "@oko-wallet-user-dashboard/types/chain";

interface KeplrChainsResponse {
  chains: CosmosChainInfo[];
}

async function fetchChains(): Promise<ModularChainInfo[]> {
  const response = await fetch(`${KEPLR_API_ENDPOINT}/v1/chains`);
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
    retry: 1,
  });

  // Merge Keplr chains with non-Cosmos chains (Solana, etc.)
  const allChains = useMemo(() => {
    const keplrChains = query.data ?? [];
    return [...keplrChains, SOLANA_MAINNET, SOLANA_DEVNET, SOLANA_TESTNET];
  }, [query.data]);

  return {
    chains: allChains,
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
    // Use default if no user preferences or empty array
    const enabledChainIds = userChainIds?.length
      ? userChainIds
      : [...DEFAULT_ENABLED_CHAINS];

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
