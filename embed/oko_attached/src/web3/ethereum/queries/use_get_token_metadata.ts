import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import type { Address, PublicClient } from "viem";

import { COMMON_READ_FUNCTIONS_ABI } from "@oko-wallet-attached/web3/ethereum/decoder";

export type GetTokenMetadataResult = {
  name?: string;
  symbol?: string;
  decimals?: number;
};

export interface UseGetTokenMetadataProps {
  tokenAddress?: Address;
  client?: PublicClient;
  isERC20?: boolean;
  options?: Partial<UseQueryOptions<GetTokenMetadataResult>>;
}

export function useGetTokenMetadata({
  tokenAddress,
  client,
  isERC20,
  options,
}: UseGetTokenMetadataProps) {
  return useQuery({
    queryKey: ["get-token-metadata", tokenAddress, client?.chain?.id, isERC20],
    queryFn: async () => {
      const defaultResult = {
        name: undefined,
        symbol: undefined,
        decimals: undefined,
      };

      if (!tokenAddress || !client) {
        return defaultResult;
      }
      try {
        const [name, symbol, decimals] = await Promise.all([
          client
            .readContract({
              address: tokenAddress,
              abi: COMMON_READ_FUNCTIONS_ABI,
              functionName: "name",
            })
            .catch(() => undefined),
          client
            .readContract({
              address: tokenAddress,
              abi: COMMON_READ_FUNCTIONS_ABI,
              functionName: "symbol",
            })
            .catch(() => undefined),
          isERC20
            ? client
                .readContract({
                  address: tokenAddress,
                  abi: COMMON_READ_FUNCTIONS_ABI,
                  functionName: "decimals",
                })
                .catch(() => undefined)
            : Promise.resolve(undefined),
        ]);
        return { name, symbol, decimals };
      } catch {
        return defaultResult;
      }
    },
    ...options,
    enabled: !!tokenAddress && !!client && options?.enabled !== false,
  });
}
