import {
  type UseQueryOptions,
  useQueries,
  useQuery,
} from "@tanstack/react-query";
import { createPublicClient, type GetEnsAvatarReturnType, http } from "viem";
import { normalize } from "viem/ens";

import { mainnetChain } from "@oko-wallet-attached/web3/ethereum/constants";

export interface UseGetENSAvatarProps {
  name?: string;
  options?: UseQueryOptions<GetEnsAvatarReturnType>;
}

export function useGetENSAvatar({ name, options }: UseGetENSAvatarProps) {
  const client = createPublicClient({
    chain: mainnetChain,
    transport: http(),
  });

  return useQuery({
    ...options,
    queryKey: ["ens-avatar", name],
    queryFn: async () => {
      if (!client || !name) {
        return null;
      }

      return await client.getEnsAvatar({ name: normalize(name) });
    },
    enabled: !!client && !!name,
  });
}

export interface UseGetENSAvatarsProps {
  names?: string[];
  options?: Partial<UseQueryOptions<GetEnsAvatarReturnType>>;
}

export interface UseGetENSAvatarsResult {
  data: {
    ensAvatarsMapping: Record<string, string | null>;
    ensAvatars: string[];
  };
  isLoading: boolean;
  nameLoadingStates: Record<string, boolean>;
  hasError: boolean;
  errors: Error[];
}

export function useGetENSAvatars({
  names = [],
  options,
}: UseGetENSAvatarsProps): UseGetENSAvatarsResult {
  const client = createPublicClient({
    chain: mainnetChain,
    transport: http(),
  });

  const queries = useQueries({
    queries: names.map((name) => ({
      ...options,
      queryKey: ["ens-avatar", name],
      queryFn: async () => {
        if (!client || !name) {
          return null;
        }

        return await client.getEnsAvatar({ name: normalize(name) });
      },
      enabled: !!client && options?.enabled !== false,
    })),
  });

  const { ensAvatarsMapping, ensAvatars } = (() => {
    const ensAvatars: string[] = [];
    const mapping: Record<string, string | null> = {};
    if (names) {
      names.forEach((name, index) => {
        if (queries[index]?.data) {
          ensAvatars.push(queries[index].data);
          mapping[name] = queries[index].data;
        }
      });
    }

    return { ensAvatarsMapping: mapping, ensAvatars };
  })();

  const nameLoadingStates: Record<string, boolean> = {};
  if (names) {
    names.forEach((name, index) => {
      nameLoadingStates[name] = queries[index]?.isLoading ?? false;
    });
  }

  const isLoading = queries.some((query) => query.isLoading);
  const hasError = queries.some((query) => query.isError);
  const errors = queries
    .map((query) => query.error)
    .filter((error) => error !== null);

  return {
    data: { ensAvatarsMapping, ensAvatars },
    isLoading,
    nameLoadingStates,
    hasError,
    errors,
  };
}
