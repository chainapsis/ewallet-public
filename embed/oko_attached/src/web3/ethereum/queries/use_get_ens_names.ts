import {
  type UseQueryOptions,
  useQueries,
  useQuery,
} from "@tanstack/react-query";
import {
  type Address,
  createPublicClient,
  type GetEnsNameReturnType,
  http,
  isAddressEqual,
  zeroAddress,
} from "viem";

import { mainnetChain } from "@oko-wallet-attached/web3/ethereum/constants";

export interface UseGetENSNameProps {
  address?: Address;
  options?: UseQueryOptions<GetEnsNameReturnType>;
}

export function useGetENSName({ address, options }: UseGetENSNameProps) {
  const client = createPublicClient({
    chain: mainnetChain,
    transport: http(),
  });

  return useQuery({
    ...options,
    queryKey: ["ens-name", address],
    queryFn: async () => {
      if (!client || !address || isAddressEqual(address, zeroAddress)) {
        return null;
      }

      return await client.getEnsName({ address });
    },
    enabled: !!client && !!address,
  });
}

export interface UseGetENSNamesProps {
  addresses?: Address[];
  options?: Partial<UseQueryOptions<GetEnsNameReturnType>>;
}

export interface UseGetENSNamesResult {
  data: {
    ensNamesMapping: Record<string, string | null>;
    ensNames: string[];
  };
  isLoading: boolean;
  addressLoadingStates: Record<string, boolean>;
  hasError: boolean;
  errors: Error[];
}

export function useGetENSNames({
  addresses = [],
  options,
}: UseGetENSNamesProps): UseGetENSNamesResult {
  const client = createPublicClient({
    chain: mainnetChain,
    transport: http(),
  });

  const queries = useQueries({
    queries: addresses.map((address) => ({
      ...options,
      queryKey: ["ens-name", address],
      queryFn: async () => {
        if (!client || isAddressEqual(address, zeroAddress)) {
          return null;
        }

        return await client.getEnsName({ address });
      },
      enabled: !!client && options?.enabled !== false,
    })),
  });

  const { ensNamesMapping, ensNames } = (() => {
    const ensNames: string[] = [];
    const mapping: Record<string, string | null> = {};
    if (addresses) {
      addresses.forEach((address, index) => {
        if (queries[index]?.data) {
          ensNames.push(queries[index].data);
          mapping[address] = queries[index].data;
        }
      });
    }

    return { ensNamesMapping: mapping, ensNames };
  })();

  const addressLoadingStates: Record<string, boolean> = {};
  if (addresses) {
    addresses.forEach((address, index) => {
      addressLoadingStates[address] = queries[index]?.isLoading ?? false;
    });
  }

  const isLoading = queries.some((query) => query.isLoading);
  const hasError = queries.some((query) => query.isError);
  const errors = queries
    .map((query) => query.error)
    .filter((error) => error !== null);

  return {
    data: { ensNamesMapping, ensNames },
    isLoading,
    addressLoadingStates,
    hasError,
    errors,
  };
}
