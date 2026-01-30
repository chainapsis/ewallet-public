/**
 * Price fetching with TanStack Query
 * Replaces CoinGeckoPriceStore from @keplr-wallet/stores
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useEnabledChains } from "./use_chains";
import { COINGECKO_ENDPOINT } from "@oko-wallet-user-dashboard/fetch";

interface PriceResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

async function fetchPrices(coinIds: string[]): Promise<PriceResponse> {
  if (coinIds.length === 0) {
    return {};
  }

  const uniqueIds = [...new Set(coinIds)];
  const url = `${COINGECKO_ENDPOINT}/price/simple?ids=${uniqueIds.join(",")}&vs_currencies=usd`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch prices: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all CoinGecko IDs from enabled chains
 */
function extractCoinGeckoIds(
  chains: {
    cosmos?: { currencies: { coinGeckoId?: string }[] };
    evm?: { currencies: { coinGeckoId?: string }[] };
  }[],
): string[] {
  const ids: string[] = [];

  for (const chain of chains) {
    if (chain.cosmos) {
      for (const currency of chain.cosmos.currencies) {
        if (currency.coinGeckoId) {
          ids.push(currency.coinGeckoId);
        }
      }
    }
    if (chain.evm) {
      for (const currency of chain.evm.currencies) {
        if (currency.coinGeckoId) {
          ids.push(currency.coinGeckoId);
        }
      }
    }
  }

  return [...new Set(ids)];
}

/**
 * Hook to fetch prices for all tokens in enabled chains
 */
export function usePrices() {
  const { chains: enabledChains } = useEnabledChains();

  const coinGeckoIds = useMemo(
    () => extractCoinGeckoIds(enabledChains),
    [enabledChains],
  );

  const query = useQuery({
    queryKey: ["prices", coinGeckoIds],
    queryFn: () => fetchPrices(coinGeckoIds),
    enabled: coinGeckoIds.length > 0,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });

  // Create a map of coinGeckoId -> price
  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (query.data) {
      for (const [coinId, priceData] of Object.entries(query.data)) {
        map[coinId] = priceData.usd;
      }
    }
    return map;
  }, [query.data]);

  return {
    prices: query.data ?? {},
    priceMap,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}

/**
 * Hook to get price for a specific token
 */
export function useTokenPrice(coinGeckoId: string | undefined) {
  const { priceMap, isLoading } = usePrices();

  return {
    price: coinGeckoId ? priceMap[coinGeckoId] : undefined,
    isLoading,
  };
}

/**
 * Calculate USD value for a token amount
 */
export function calculateUsdValue(
  amount: string,
  decimals: number,
  priceUsd: number | undefined,
): number | undefined {
  if (!priceUsd) {
    return undefined;
  }

  const amountBigInt = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const integerPart = Number(amountBigInt / divisor);
  const fractionalPart = Number(amountBigInt % divisor) / Number(divisor);
  const humanAmount = integerPart + fractionalPart;

  return humanAmount * priceUsd;
}
