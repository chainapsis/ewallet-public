import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import type { Address, Chain, PublicClient, RpcTransactionRequest } from "viem";
import { publicActionsL2 } from "viem/op-stack";

import {
  DEFAULT_RETRY_COUNT,
  type L1GasEstimationValue,
  type StructuredRpcError,
} from "./types";
import { classifyViemErrorDetailed } from "@oko-wallet-attached/web3/ethereum/error";

export interface UseGetL1GasEstimationProps {
  simulationKey: string;
  signer: Address;
  rpcTxRequest: RpcTransactionRequest;
  chain?: Chain;
  nonce?: number;
  client?: PublicClient;
  options?: Partial<
    UseQueryOptions<L1GasEstimationValue | null, StructuredRpcError>
  >;
}

export function useGetL1GasEstimation(args: UseGetL1GasEstimationProps) {
  const { simulationKey, signer, rpcTxRequest, chain, nonce, client, options } =
    args;

  return useQuery({
    queryKey: ["estimateL1Gas", simulationKey, nonce, chain?.id],
    queryFn: async () => {
      if (!client) {
        throw new Error("No public client available");
      }

      const l2Client = client.extend(publicActionsL2());

      try {
        const l1Gas = await l2Client.estimateL1Gas({
          chain,
          account: signer,
          to: rpcTxRequest.to,
          data: rpcTxRequest.data,
          value: rpcTxRequest.value ? BigInt(rpcTxRequest.value) : undefined,
          nonce,
        });

        const l1Fee = await l2Client.estimateL1Fee({
          chain,
          account: signer,
          to: rpcTxRequest.to,
          data: rpcTxRequest.data,
          value: rpcTxRequest.value ? BigInt(rpcTxRequest.value) : undefined,
          nonce,
        });

        return { l1Gas, l1Fee };
      } catch (error) {
        const structuredError = classifyViemErrorDetailed(error);

        console.error("L1 gas estimation failed:", structuredError);

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
