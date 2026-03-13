import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import type { Address, Chain, PublicClient } from "viem";

import {
  DEFAULT_RETRY_COUNT,
  type FeeCurrencyBalanceValue,
  type StructuredRpcError,
} from "./types";
import { classifyViemErrorDetailed } from "@oko-wallet-attached/web3/ethereum/error";

export interface UseGetFeeCurrencyBalanceProps {
  simulationKey: string;
  signer: Address;
  chain?: Chain;
  client?: PublicClient;
  options?: Partial<
    UseQueryOptions<FeeCurrencyBalanceValue, StructuredRpcError>
  >;
}

export function useGetFeeCurrencyBalance({
  simulationKey,
  signer,
  chain,
  client,
  options,
}: UseGetFeeCurrencyBalanceProps) {
  return useQuery({
    queryKey: ["getFeeCurrencyBalance", simulationKey, signer, chain?.id],
    queryFn: async () => {
      if (!chain || !client) {
        throw new Error("No public client available");
      }

      // NOTE: as of now, we only support native currency as fee currency
      const nativeCurrency = chain?.nativeCurrency;

      if (!nativeCurrency) {
        throw new Error("No native currency found for the chain");
      }

      try {
        const balance = await client.getBalance({
          address: signer,
        });

        const feeCurrencyBalance: FeeCurrencyBalanceValue = {
          amount: balance,
          nativeCurrency,
          feeCurrency: nativeCurrency,
        };

        return feeCurrencyBalance;
      } catch (error) {
        const structuredError = classifyViemErrorDetailed(error);

        console.error("Native balance fetch failed:", structuredError);

        throw structuredError;
      }
    },
    retry(failureCount, error) {
      if (error.retryable) {
        if (failureCount >= DEFAULT_RETRY_COUNT) {
          return false;
        }
        return true;
      }

      return false;
    },
    ...options,
    enabled: !!client && options?.enabled !== false,
  });
}
