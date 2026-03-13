import type { EthereumTxSignPayload } from "@oko-wallet/oko-sdk-core";
import { useEffect, useState } from "react";
import {
  type Address,
  createPublicClient,
  type DecodeFunctionDataReturnType,
  type Hex,
  hexToBigInt,
  http,
  isAddressEqual,
  maxUint256,
  zeroAddress,
} from "viem";

import type { EthTxAction } from "@oko-wallet-attached/components/modal_variants/eth/tx_sig/actions/types";
import { validateArgsForFunction } from "@oko-wallet-attached/web3/ethereum/decoder";
import { useSupportedEthChain } from "@oko-wallet-attached/web3/ethereum/hooks/use_supported_eth_chain";
import {
  useDecodedCalldata,
  useSupportsERC20Interface,
} from "@oko-wallet-attached/web3/ethereum/queries";
import {
  findCurrencyByErc20Address,
  findNativeCurrencyWithFallback,
} from "@oko-wallet-attached/web3/ethereum/utils";

export function useEthereumTxActions(payload: EthereumTxSignPayload) {
  const rpcTxRequest = payload.data.transaction;
  const chainInfo = payload.chain_info;

  const { isSupportedChain, isSupportChecking, evmChain } =
    useSupportedEthChain({ chainInfoForModal: chainInfo });

  const [actions, setActions] = useState<EthTxAction[] | null>(null);

  const publicClient = evmChain
    ? createPublicClient({
        chain: evmChain,
        transport: http(),
      })
    : undefined;

  const decodedCalldataQuery = useDecodedCalldata({
    calldata: rpcTxRequest.data,
    options: {
      enabled: isSupportedChain,
    },
  });

  const supportsERC20InterfaceQuery = useSupportsERC20Interface({
    to: rpcTxRequest.to ? rpcTxRequest.to : undefined,
    client: publicClient,
    calldata: rpcTxRequest.data,
    options: {
      enabled: isSupportedChain,
    },
  });

  function computeEthereumTxActions(params: {
    decoded: DecodeFunctionDataReturnType | null;
    supportsERC20Interface: boolean;
    rpcTo: Address | null;
    rpcValue: Hex | null;
    chainInfo: typeof chainInfo;
  }): EthTxAction[] | null {
    const { decoded, supportsERC20Interface, rpcTo, rpcValue, chainInfo } =
      params;

    const safeNum = (x: bigint): number => {
      const n = Number(x);
      return Number.isFinite(n) ? n : 0;
    };

    // If the to address is not properly set, it's a contract deployment
    if (
      rpcTo === null ||
      rpcTo === "0x" ||
      isAddressEqual(rpcTo, zeroAddress)
    ) {
      // CHECK: parsing constructor calldata necessary?
      return [{ kind: "unknown", title: "Deploy contract" }];
    }

    // If there is no decoded calldata, it's a native transfer
    if (!decoded) {
      const amount = hexToBigInt(rpcValue ?? "0x");
      return [
        {
          kind: "native.transfer",
          to: rpcTo,
          currency: findNativeCurrencyWithFallback(chainInfo),
          amount,
        },
      ];
    }

    if (rpcTo === null) {
      return [{ kind: "unknown", title: "Invalid transaction" }];
    }

    const fn = decoded.functionName;
    const args: unknown[] = Array.isArray(decoded.args) ? decoded.args : [];

    if (!validateArgsForFunction(fn, args)) {
      return [
        {
          kind: "unknown",
          title: fn ? `Execute ${fn}` : "Unknown transaction",
        },
      ];
    }

    if (supportsERC20Interface) {
      const currency = findCurrencyByErc20Address(
        chainInfo,
        rpcTo ?? undefined,
      );

      if (fn === "transfer" && args.length === 2) {
        const [to, amount] = args as [Address, bigint];
        return [
          {
            kind: "erc20.transfer",
            tokenAddress: rpcTo!,
            to,
            currency,
            amount,
          },
        ];
      }

      if (fn === "transferFrom" && args.length === 3) {
        const [from, to, amount] = args as [Address, Address, bigint];
        return [
          {
            kind: "erc20.transferFrom",
            tokenAddress: rpcTo!,
            from,
            to,
            currency,
            amount,
          },
        ];
      }

      if (fn === "approve" && args.length === 2) {
        const [spender, amount] = args as [Address, bigint];
        return [
          {
            kind: "erc20.approve",
            tokenAddress: rpcTo!,
            to: spender,
            currency,
            amount,
          },
        ];
      }

      if (fn === "permit") {
        // EIP-2612: (owner, spender, value, deadline, bytes)
        // or (owner, spender, value, deadline, v,r,s)
        if (args.length === 5 || args.length === 7) {
          const [owner, spender, value, deadline] = args as [
            Address,
            Address,
            bigint,
            bigint,
            ...any[],
          ];
          return [
            {
              kind: "erc20.permit",
              tokenAddress: rpcTo!,
              owner,
              to: spender,
              currency,
              amount: value,
              deadline: safeNum(deadline),
            },
          ];
        }

        // DAI-style: (holder, spender, nonce, expiry, allowed, v,r,s)
        if (args.length === 8) {
          const [holder, spender, _nonce, expiry, allowed] = args as [
            Address,
            Address,
            bigint,
            bigint,
            boolean,
            ...any[],
          ];
          const amount = allowed ? maxUint256 : BigInt(0);
          return [
            {
              kind: "erc20.permit",
              tokenAddress: rpcTo!,
              owner: holder,
              to: spender,
              currency,
              amount,
              deadline: safeNum(expiry),
            },
          ];
        }
      }
    }

    return [
      { kind: "unknown", title: fn ? `Execute ${fn}` : "Unknown transaction" },
    ];
  }

  useEffect(() => {
    if (
      !isSupportedChain ||
      decodedCalldataQuery.isLoading ||
      supportsERC20InterfaceQuery.isLoading
    ) {
      setActions(null);
      return;
    }

    setActions(
      computeEthereumTxActions({
        decoded: decodedCalldataQuery.data ?? null,
        supportsERC20Interface: supportsERC20InterfaceQuery.data ?? false,
        rpcTo: rpcTxRequest.to ?? null,
        rpcValue: rpcTxRequest.value ?? null,
        chainInfo,
      }),
    );
  }, [
    isSupportedChain,
    decodedCalldataQuery.data,
    decodedCalldataQuery.isLoading,
    supportsERC20InterfaceQuery.data,
    supportsERC20InterfaceQuery.isLoading,
    rpcTxRequest,
    chainInfo,
  ]);

  const isCalldataDecoding =
    decodedCalldataQuery.isLoading || supportsERC20InterfaceQuery.isLoading;

  const isLoading = isSupportChecking || isCalldataDecoding;

  const error = decodedCalldataQuery.error ?? supportsERC20InterfaceQuery.error;

  return {
    actions,
    chain: evmChain,
    isLoading,
    error,
  };
}
