import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import type { Address, Hex, PublicClient } from "viem";
import { decodeFunctionData, isAddressEqual, zeroAddress } from "viem";

import {
  ERC20_INTERFACE_ID,
  ERC20_WRITE_FUNCTIONS_ABI,
  ERC165_ABI,
} from "@oko-wallet-attached/web3/ethereum/decoder";

export interface UseSupportsERC20InterfaceProps {
  to?: Address;
  client?: PublicClient;
  calldata?: Hex;
  options?: Partial<UseQueryOptions<boolean>>;
}

export function useSupportsERC20Interface({
  to,
  client,
  calldata,
  options,
}: UseSupportsERC20InterfaceProps) {
  return useQuery({
    queryKey: ["check-erc20-interface", to, calldata],
    queryFn: async () => {
      if (!to || !client || isAddressEqual(to, zeroAddress)) {
        return false;
      }

      try {
        const supports = await client.readContract({
          address: to,
          abi: ERC165_ABI,
          functionName: "supportsInterface",
          args: [ERC20_INTERFACE_ID],
        });

        if (supports) {
          return true;
        }

        throw new Error("Token does not support ERC20 interface");
      } catch {
        if (!calldata) {
          return false;
        }

        try {
          decodeFunctionData({
            abi: ERC20_WRITE_FUNCTIONS_ABI,
            data: calldata,
          });
          return true;
        } catch {
          return false;
        }
      }
    },
    ...options,
    enabled: !!to && !!client && options?.enabled !== false,
  });
}
