import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import type {
  Address,
  Chain,
  EstimateGasParameters,
  Hex,
  PublicClient,
  RpcTransactionRequest,
  StateOverride,
} from "viem";
import { concat, keccak256, pad, parseUnits, toHex } from "viem";

import {
  DEFAULT_MULTIPLIER,
  DEFAULT_RETRY_COUNT,
  type StructuredRpcError,
} from "./types";
import { DEMO_WEB_ORIGIN } from "@oko-wallet-attached/requests/endpoints";
import { classifyViemErrorDetailed } from "@oko-wallet-attached/web3/ethereum/error";

export interface UseGetGasEstimationProps {
  simulationKey: string;
  signer: Address;
  rpcTxRequest: RpcTransactionRequest;
  chain?: Chain;
  nonce?: number;
  multiplier?: number;
  client?: PublicClient;
  hostOrigin?: string;
  options?: Partial<UseQueryOptions<bigint, StructuredRpcError>>;
}

export function useGetGasEstimation({
  simulationKey,
  signer,
  rpcTxRequest,
  nonce,
  chain,
  multiplier = DEFAULT_MULTIPLIER,
  client,
  hostOrigin,
  options,
}: UseGetGasEstimationProps) {
  // TODO: Why necessary?
  const isDemo = !!hostOrigin && hostOrigin === DEMO_WEB_ORIGIN;
  const clampedMultiplier = Math.max(1, Math.min(3, multiplier));

  return useQuery({
    queryKey: ["estimateGas", simulationKey, signer, nonce, chain?.id],
    queryFn: async (): Promise<bigint> => {
      if (!client) {
        throw new Error("No public client available");
      }

      try {
        const txForEstimation: EstimateGasParameters = {
          account: signer,
          to: rpcTxRequest.to,
          data: rpcTxRequest.data,
          value: rpcTxRequest.value ? BigInt(rpcTxRequest.value) : undefined,
          nonce,
        };

        let stateOverride: StateOverride = [];

        // NOTE: If demo, set balance of the signer to 1 USDC
        // this is only for demo purpose
        if (isDemo) {
          stateOverride = getDemoStateOverride(signer, rpcTxRequest);
        }

        // CHECK: ethereum mainnet gas estimation query is sometimes too slow
        // as of now, we just use the public rpc endpoint for gas estimation
        // and state override might slow down the query response time
        // chain info management should be improved before production release
        const estimatedGas = await client.estimateGas({
          ...txForEstimation,
          stateOverride,
        });

        const estimatedGasWithMultiplier =
          (estimatedGas * BigInt(clampedMultiplier * 1000)) / BigInt(1000);

        return estimatedGasWithMultiplier;
      } catch (error) {
        const structuredError = classifyViemErrorDetailed(error);
        console.error("Gas estimation failed:", structuredError);

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
    enabled:
      nonce !== undefined &&
      nonce >= 0 &&
      !!client &&
      options?.enabled !== false,
  });
}

function getDemoStateOverride(
  signer: Address,
  rpcTxRequest: RpcTransactionRequest,
): StateOverride {
  const stateOverride: StateOverride = [];

  const USDC_BALANCES_SLOT = BigInt(9);

  const getUsdcBalanceSlot = (addr: Address): Hex => {
    // pad address to 32 bytes
    const paddedKey = pad(addr, { size: 32 });
    // pad slot index to 32 bytes
    const paddedSlot = pad(toHex(USDC_BALANCES_SLOT), { size: 32 });
    // concat padded key and slot then hash
    return keccak256(concat([paddedKey, paddedSlot]));
  };

  const desiredBalance = parseUnits("1", 6);
  const desiredBalance32 = pad(toHex(desiredBalance), { size: 32 });

  // calculate slot for state override
  const slotForSender = getUsdcBalanceSlot(signer);

  stateOverride.push({
    address: rpcTxRequest.to!,
    stateDiff: [
      {
        slot: slotForSender,
        value: desiredBalance32,
      },
    ],
  });

  return stateOverride;
}
