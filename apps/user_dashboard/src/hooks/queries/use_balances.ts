import { Connection, PublicKey } from "@solana/web3.js";
import { useQueries, useQuery } from "@tanstack/react-query";

import {
  useCosmosAddresses,
  useEthAddress,
  useSVMAddress,
} from "./use_addresses";
import { useEnabledChains } from "./use_chains";
import { usePrices } from "./use_prices";
import type { ModularChainInfo } from "@oko-wallet-user-dashboard/types/chain";
import type {
  RawBalance,
  TokenBalance,
} from "@oko-wallet-user-dashboard/types/token";
import { getChainIdentifier } from "@oko-wallet-user-dashboard/utils/chain";
import { calculateUsdValue } from "@oko-wallet-user-dashboard/utils/format_token_amount";

/**
 * Fetch Cosmos balances from LCD endpoint
 */
async function fetchCosmosBalances(
  restEndpoint: string,
  cosmosAddress: string,
): Promise<RawBalance[]> {
  const response = await fetch(
    `${restEndpoint}/cosmos/bank/v1beta1/balances/${cosmosAddress}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch balances: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.balances ?? []) as RawBalance[];
}

/**
 * Fetch EVM native balance
 */
async function fetchEvmBalance(
  rpcEndpoint: string,
  address: string,
): Promise<string> {
  const response = await fetch(rpcEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch EVM balance: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }

  // Convert hex to decimal string
  return BigInt(data.result).toString();
}

async function fetchSVMBalance(
  rpcEndpoint: string,
  address: string,
): Promise<string> {
  const connection = new Connection(rpcEndpoint);
  const pubkey = new PublicKey(address);
  const balance = await connection.getBalance(pubkey);
  // Return as lamports string (similar to wei for EVM)
  return balance.toString();
}

interface UseBalancesOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch balances for a specific chain
 */
export function useChainBalances(
  chainInfo: ModularChainInfo | undefined,
  options?: UseBalancesOptions,
) {
  const chainId = chainInfo?.chainId;
  const isEvm = chainInfo?.evm !== undefined;
  const isCosmos = chainInfo?.cosmos !== undefined;
  const isSVM = chainInfo?.svm !== undefined;

  // Get addresses using TanStack Query hooks
  const { address: ethAddress } = useEthAddress();
  const { address: svmAddress } = useSVMAddress();
  const { addresses: cosmosAddresses } = useCosmosAddresses();
  const cosmosAddress = chainId ? cosmosAddresses[chainId] : undefined;

  // Cosmos balances query
  const cosmosQuery = useQuery({
    queryKey: ["balances", "cosmos", chainId, cosmosAddress],
    queryFn: async () => {
      if (!chainInfo?.cosmos?.rest || !cosmosAddress) {
        return [];
      }
      return fetchCosmosBalances(chainInfo.cosmos.rest, cosmosAddress);
    },
    enabled:
      (options?.enabled ?? true) &&
      isCosmos &&
      !!cosmosAddress &&
      !!chainInfo?.cosmos?.rest,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });

  // EVM native balance query
  const evmQuery = useQuery({
    queryKey: ["balances", "evm", chainId, ethAddress],
    queryFn: async () => {
      if (!chainInfo?.evm?.rpc || !ethAddress) {
        return "0";
      }
      return fetchEvmBalance(chainInfo.evm.rpc, ethAddress);
    },
    enabled:
      (options?.enabled ?? true) &&
      isEvm &&
      !!ethAddress &&
      !!chainInfo?.evm?.rpc,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // SVM native balance query
  const svmQuery = useQuery({
    queryKey: ["balances", "svm", chainId, svmAddress],
    queryFn: async () => {
      if (!chainInfo?.svm?.rpc || !svmAddress) {
        return "0";
      }
      return fetchSVMBalance(chainInfo.svm.rpc, svmAddress);
    },
    enabled:
      (options?.enabled ?? true) &&
      isSVM &&
      !!svmAddress &&
      !!chainInfo?.svm?.rpc,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  return {
    cosmosBalances: cosmosQuery.data ?? [],
    evmBalance: evmQuery.data ?? "0",
    svmBalance: svmQuery.data ?? "0",
    isLoading:
      cosmosQuery.isLoading || evmQuery.isLoading || svmQuery.isLoading,
    isFetching:
      cosmosQuery.isFetching || evmQuery.isFetching || svmQuery.isFetching,
    error: cosmosQuery.error || evmQuery.error || svmQuery.error,
  };
}

/**
 * Hook to fetch balances for all enabled chains
 */
export function useAllBalances() {
  const { chains: enabledChains, isLoading: chainsLoading } =
    useEnabledChains();
  const { priceMap, isLoading: pricesLoading } = usePrices();

  // Get addresses using TanStack Query hooks
  const { address: ethAddress, isLoading: ethLoading } = useEthAddress();
  const { address: svmAddress, isLoading: svmLoading } = useSVMAddress();
  const { addresses: cosmosAddresses, isLoading: addressesLoading } =
    useCosmosAddresses();

  // Create queries for all chains
  const balanceQueries = useQueries({
    queries: enabledChains.map((chain) => {
      const isCosmos = chain.cosmos !== undefined;
      const isEvm = chain.evm !== undefined;
      const isSVM = chain.svm !== undefined;
      const cosmosAddress = isCosmos
        ? cosmosAddresses[chain.chainId]
        : undefined;

      return {
        queryKey: [
          "balances",
          chain.chainId,
          cosmosAddress,
          ethAddress,
          svmAddress,
        ],
        queryFn: async (): Promise<TokenBalance[]> => {
          const results: TokenBalance[] = [];

          // Fetch Cosmos balances
          if (isCosmos && cosmosAddress && chain.cosmos?.rest) {
            try {
              const rawBalances = await fetchCosmosBalances(
                chain.cosmos.rest,
                cosmosAddress,
              );

              for (const bal of rawBalances) {
                const currency = chain.cosmos.currencies.find(
                  (c) => c.coinMinimalDenom === bal.denom,
                );
                if (currency && BigInt(bal.amount) > BigInt(0)) {
                  results.push({
                    chainInfo: chain,
                    token: { currency, amount: bal.amount },
                    address: cosmosAddress,
                    priceUsd: currency.coinGeckoId
                      ? priceMap[currency.coinGeckoId]
                      : undefined,
                    isFetching: false,
                    error: undefined,
                  });
                }
              }
            } catch (error) {
              console.error(
                `Failed to fetch Cosmos balances for ${chain.chainId}:`,
                error,
              );
            }
          }

          // Fetch EVM native balance
          if (isEvm && ethAddress && chain.evm?.rpc) {
            try {
              const balance = await fetchEvmBalance(chain.evm.rpc, ethAddress);
              const nativeCurrency = chain.evm.currencies[0];
              if (nativeCurrency && BigInt(balance) > BigInt(0)) {
                results.push({
                  chainInfo: chain,
                  token: { currency: nativeCurrency, amount: balance },
                  address: ethAddress,
                  priceUsd: nativeCurrency.coinGeckoId
                    ? priceMap[nativeCurrency.coinGeckoId]
                    : undefined,
                  isFetching: false,
                  error: undefined,
                });
              }
            } catch (error) {
              console.error(
                `Failed to fetch EVM balance for ${chain.chainId}:`,
                error,
              );
            }
          }

          if (isSVM && svmAddress && chain.svm?.rpc) {
            try {
              const balance = await fetchSVMBalance(chain.svm.rpc, svmAddress);
              const nativeCurrency = chain.svm.currencies[0];
              if (nativeCurrency && BigInt(balance) > BigInt(0)) {
                results.push({
                  chainInfo: chain,
                  token: { currency: nativeCurrency, amount: balance },
                  address: svmAddress,
                  priceUsd: nativeCurrency.coinGeckoId
                    ? priceMap[nativeCurrency.coinGeckoId]
                    : undefined,
                  isFetching: false,
                  error: undefined,
                });
              }
            } catch (error) {
              console.error(
                `Failed to fetch SVM balance for ${chain.chainId}:`,
                error,
              );
            }
          }

          return results;
        },
        enabled:
          (isCosmos && !!cosmosAddress) ||
          (isEvm && !!ethAddress) ||
          (isSVM && !!svmAddress),
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000,
      };
    }),
  });

  // Aggregate all balances
  const allBalances = balanceQueries
    .flatMap((query) => query.data ?? [])
    .sort((a, b) => {
      // Sort by USD value (descending)
      const aValue =
        a.priceUsd && a.token.currency.coinDecimals
          ? calculateUsdValue(
              a.token.amount,
              a.token.currency.coinDecimals,
              a.priceUsd,
            )
          : 0;
      const bValue =
        b.priceUsd && b.token.currency.coinDecimals
          ? calculateUsdValue(
              b.token.amount,
              b.token.currency.coinDecimals,
              b.priceUsd,
            )
          : 0;
      return bValue - aValue;
    });

  // Group balances by chain identifier
  const balancesByChainIdentifier = new Map();
  for (const balance of allBalances) {
    const identifier = getChainIdentifier(balance.chainInfo.chainId);
    const existing = balancesByChainIdentifier.get(identifier) ?? [];
    existing.push(balance);
    balancesByChainIdentifier.set(identifier, existing);
  }

  const isLoading =
    chainsLoading ||
    ethLoading ||
    svmLoading ||
    addressesLoading ||
    balanceQueries.some((q) => q.isLoading) ||
    pricesLoading;
  const isFetching = balanceQueries.some((q) => q.isFetching);
  const hasError = balanceQueries.some((q) => q.error);

  return {
    balances: allBalances,
    balancesByChainIdentifier,
    isLoading,
    isFetching,
    hasError,
  };
}

/**
 * Calculate total USD value of all balances
 */
export function useTotalBalance() {
  const { balances, isLoading } = useAllBalances();

  let totalUsd = 0;
  for (const bal of balances) {
    if (!bal.priceUsd) {
      continue;
      // return sum;
    }

    totalUsd += calculateUsdValue(
      bal.token.amount,
      bal.token.currency.coinDecimals,
      bal.priceUsd,
    );
  }

  return {
    totalUsd,
    isLoading,
  };
}
