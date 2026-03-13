import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import type { Chain, PublicClient } from "viem";

import {
  DEFAULT_MULTIPLIER,
  DEFAULT_RETRY_COUNT,
  type FeeDataValue,
  type FeeType,
  type StructuredRpcError,
} from "./types";
import { classifyViemErrorDetailed } from "@oko-wallet-attached/web3/ethereum/error";

export interface UseGetFeeDataProps {
  simulationKey: string;
  feeType: FeeType;
  chain?: Chain;
  multiplier?: number;
  client?: PublicClient;
  options?: Partial<UseQueryOptions<FeeDataValue, StructuredRpcError>>;
}

export function useGetFeeData({
  simulationKey,
  feeType,
  chain,
  multiplier = DEFAULT_MULTIPLIER,
  client,
  options,
}: UseGetFeeDataProps) {
  const clampedMultiplier = Math.max(1, Math.min(3, multiplier));

  return useQuery({
    queryKey: ["getFeeData", simulationKey, chain?.id],
    queryFn: async () => {
      if (!client) {
        throw new Error("No public client available");
      }

      try {
        let feeData: FeeDataValue;

        switch (feeType) {
          case "eip1559": {
            // TODO: average the fee history over a few blocks
            const feeHistory = await client.getFeeHistory({
              blockCount: 1,
              rewardPercentiles: [50],
            });

            const baseFeePerGas = feeHistory.baseFeePerGas[0];

            const maxPriorityFeePerGas = feeHistory.reward![0][0] ?? BigInt(0);
            const maxFeePerGas = baseFeePerGas + maxPriorityFeePerGas;

            const maxFeePerGasWithMultiplier =
              (maxFeePerGas * BigInt(clampedMultiplier * 1000)) / BigInt(1000);

            feeData = {
              type: "eip1559" as const,
              maxFeePerGas: maxFeePerGasWithMultiplier,
              maxPriorityFeePerGas,
              baseFeePerGas,
            };

            break;
          }
          case "legacy": {
            const gasPrice = await client.getGasPrice();
            const gasPriceWithMultiplier =
              (gasPrice * BigInt(clampedMultiplier * 1000)) / BigInt(1000);

            feeData = {
              type: "legacy" as const,
              gasPrice: gasPriceWithMultiplier,
            };

            break;
          }
          default: {
            throw new Error("Invalid fee type");
          }
        }

        return feeData;
      } catch (error) {
        const structuredError = classifyViemErrorDetailed(error);

        console.error("Fee data fetch failed:", structuredError);

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
