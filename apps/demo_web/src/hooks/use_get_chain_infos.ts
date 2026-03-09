import type { ChainInfo } from "@keplr-wallet/types";
import { useQuery } from "@tanstack/react-query";

const CHAIN_INFO_ENDPOINT = "https://keplr-api.keplr.app/v1/chains/all";

export function useGetChainInfos() {
  return useQuery({
    queryKey: ["chain_infos"],
    queryFn: async () => {
      try {
        const response = await fetch(CHAIN_INFO_ENDPOINT);
        const data = (await response.json()) as { chains: ChainInfo[] } | null;

        const chains = data?.chains || [];

        return chains.sort((a, b) => {
          const aName = a.chainName.toLowerCase();
          const bName = b.chainName.toLowerCase();

          const priorityChains = [
            "ethereum",
            "solana",
            "cosmos hub",
            "osmosis",
          ];

          const aPriority = priorityChains.indexOf(aName);
          const bPriority = priorityChains.indexOf(bName);

          if (aPriority >= 0 === bPriority >= 0) {
            if (aPriority >= 0 && bPriority >= 0) {
              return aPriority - bPriority;
            } else {
              return aName.localeCompare(bName);
            }
          }

          return aPriority >= 0 ? -1 : 1;
        });
      } catch (error) {
        console.error("Error fetching chains:", error);
        return [];
      }
    },
  });
}
