import type { ChainInfo } from "@keplr-wallet/types";
import { queryOptions } from "@tanstack/react-query";

import { queryClient } from "@oko-wallet-attached/config/react_query";

const CHAIN_INFO_ENDPOINT = "https://keplr-api.keplr.app/v1/chains/all";

interface ChainInfoResponse {
  chains: ChainInfo[];
}

export const allChainsQuery = queryOptions<ChainInfo[]>({
  queryKey: ["keplr", "chains", "all"],
  queryFn: async () => {
    const response = await fetch(CHAIN_INFO_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Failed to fetch chain info: ${response.status}`);
    }
    const json = (await response.json()) as ChainInfoResponse | null;
    if (!json) {
      throw new Error("Empty chain info response");
    }
    return json.chains ?? [];
  },
  // Cache and reuse for 1 hour
  staleTime: 1000 * 60 * 60,
  gcTime: 1000 * 60 * 60,
  retry: 3,
  refetchOnWindowFocus: false,
});

export async function getAllChainsCached(): Promise<ChainInfo[]> {
  return queryClient.ensureQueryData(allChainsQuery);
}

const COSMOS_CHAIN_DISCRIMINATOR = "bech32Config";

export function filterCosmosChains(chains: ChainInfo[]): ChainInfo[] {
  return chains.filter((c) => COSMOS_CHAIN_DISCRIMINATOR in c);
}

export function filterEthChains(chains: ChainInfo[]): ChainInfo[] {
  return chains.filter((c) => c.chainId.startsWith("eip155:"));
}

// Solana wallet-standard uses short aliases (e.g., "solana:devnet")
// while Keplr API uses CAIP-2 format with genesis hash
const SOLANA_CHAIN_ALIASES: Record<string, string> = {
  "solana:devnet": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  "solana:mainnet": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "solana:testnet": "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
};

export async function getChainByChainId(
  chainId: string,
): Promise<ChainInfo | null> {
  const chains = await getAllChainsCached();
  // Normalize Solana chain aliases to CAIP-2 format
  const normalizedChainId = SOLANA_CHAIN_ALIASES[chainId] ?? chainId;
  return chains.find((c) => c.chainId === normalizedChainId) ?? null;
}
