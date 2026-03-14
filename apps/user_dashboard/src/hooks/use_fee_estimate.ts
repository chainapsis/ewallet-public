"use client";

import { Dec, Int } from "@keplr-wallet/unit";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

import { getTokenType } from "@oko-wallet-user-dashboard/components/send_modal/types";
import type {
  Currency,
  ModularChainInfo,
} from "@oko-wallet-user-dashboard/types/chain";
import type { TokenBalance } from "@oko-wallet-user-dashboard/types/token";
import {
  getErc20ContractAddress,
  humanToRawAmount,
} from "@oko-wallet-user-dashboard/utils/send";

interface FeeEstimateResult {
  fee: string | null;
  feeCurrency: Currency | null;
  feeRaw: string | null;
  isLoading: boolean;
  error: string | null;
}

async function estimateEvmFee(
  rpcUrl: string,
  from: string,
  to: string,
  value: string,
  data?: string,
): Promise<{ gasEstimate: bigint; gasPrice: bigint }> {
  const [gasEstimateRes, gasPriceRes] = await Promise.all([
    fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_estimateGas",
        params: [
          {
            from,
            to,
            value: value !== "0x0" ? value : undefined,
            data,
          },
        ],
        id: 1,
      }),
    }),
    fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 2,
      }),
    }),
  ]);

  const gasData = await gasEstimateRes.json();
  const priceData = await gasPriceRes.json();

  if (gasData.error) {
    throw new Error(gasData.error.message);
  }
  if (priceData.error) {
    throw new Error(priceData.error.message);
  }

  return {
    gasEstimate: BigInt(gasData.result),
    gasPrice: BigInt(priceData.result),
  };
}

function encodeErc20Transfer(to: string, amount: string): string {
  // transfer(address,uint256) selector: 0xa9059cbb
  const addressPadded = to.slice(2).toLowerCase().padStart(64, "0");
  const amountHex = BigInt(amount).toString(16).padStart(64, "0");
  return `0xa9059cbb${addressPadded}${amountHex}`;
}

async function estimateCosmosFee(
  _restUrl: string,
  chainInfo: ModularChainInfo,
): Promise<{ fee: string; currency: Currency }> {
  const feeCurrency = chainInfo.cosmos?.feeCurrencies[0];
  if (!feeCurrency) {
    throw new Error("No fee currency found");
  }

  const gasPrice = new Dec(feeCurrency.gasPriceStep?.average ?? 0.025);
  const defaultGas = new Dec(200000);
  const feeAmount = gasPrice.mul(defaultGas).roundUp().toString();

  return {
    fee: feeAmount.toString(),
    currency: feeCurrency,
  };
}

async function estimateSvmFee(
  rpcUrl: string,
  from: string,
  to: string,
): Promise<{ fee: number }> {
  const connection = new Connection(rpcUrl);
  const fromPubkey = new PublicKey(from);
  const toPubkey = new PublicKey(to);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: 1,
    }),
  );

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = fromPubkey;

  const fee = await connection.getFeeForMessage(tx.compileMessage());
  return { fee: fee.value ?? 5000 };
}

export function useFeeEstimate(params: {
  selectedToken: TokenBalance | null;
  recipientAddress: string;
  amount: string;
  senderAddress: string | undefined;
  isAddressValid: boolean;
}): FeeEstimateResult {
  const {
    selectedToken,
    recipientAddress,
    amount,
    senderAddress,
    isAddressValid,
  } = params;

  const chainInfo = selectedToken?.chainInfo ?? null;
  const enabled =
    !!selectedToken && !!recipientAddress && isAddressValid && !!senderAddress;

  const query = useQuery({
    queryKey: [
      "fee_estimate",
      chainInfo?.chainId,
      recipientAddress,
      senderAddress,
    ],
    queryFn: async (): Promise<{
      fee: string;
      feeRaw: string;
      currency: Currency;
    }> => {
      if (!chainInfo || !senderAddress || !selectedToken) {
        throw new Error("Missing params");
      }

      const tokenType = getTokenType(selectedToken.token.currency, chainInfo);

      // EVM
      if (chainInfo.evm && !chainInfo.cosmos) {
        const rpcUrl = chainInfo.evm.rpc;
        const nativeCurrency = chainInfo.evm.currencies[0];
        if (!nativeCurrency) {
          throw new Error("No native currency");
        }

        let gasResult: { gasEstimate: bigint; gasPrice: bigint };

        if (tokenType === "erc20") {
          const contractAddress = getErc20ContractAddress(
            selectedToken.token.currency.coinMinimalDenom,
          );
          const rawAmount = humanToRawAmount(
            amount || "0.001",
            selectedToken.token.currency.coinDecimals,
          );
          const data = encodeErc20Transfer(recipientAddress, rawAmount);
          gasResult = await estimateEvmFee(
            rpcUrl,
            senderAddress,
            contractAddress,
            "0x0",
            data,
          );
        } else {
          gasResult = await estimateEvmFee(
            rpcUrl,
            senderAddress,
            recipientAddress,
            "0x1",
          );
        }

        const feeWei = gasResult.gasEstimate * gasResult.gasPrice;
        const feeDec = new Dec(feeWei.toString());
        const divisor = new Dec(10).pow(new Int(nativeCurrency.coinDecimals));
        const feeHuman = feeDec.quo(divisor).toString();

        return {
          fee: feeHuman,
          feeRaw: feeWei.toString(),
          currency: nativeCurrency,
        };
      }

      // Cosmos
      if (chainInfo.cosmos) {
        const result = await estimateCosmosFee(
          chainInfo.cosmos.rest,
          chainInfo,
        );
        const feeDec = new Dec(result.fee);
        const divisor = new Dec(10).pow(new Int(result.currency.coinDecimals));
        const feeHuman = feeDec.quo(divisor).toString();

        return {
          fee: feeHuman,
          feeRaw: result.fee,
          currency: result.currency,
        };
      }

      // SVM
      if (chainInfo.svm) {
        const nativeCurrency = chainInfo.svm.currencies[0];
        if (!nativeCurrency) {
          throw new Error("No native currency");
        }

        const result = await estimateSvmFee(
          chainInfo.svm.rpc,
          senderAddress,
          recipientAddress,
        );
        const feeDec = new Dec(result.fee.toString());
        const divisor = new Dec(10).pow(new Int(nativeCurrency.coinDecimals));
        const feeHuman = feeDec.quo(divisor).toString();

        return {
          fee: feeHuman,
          feeRaw: result.fee.toString(),
          currency: nativeCurrency,
        };
      }

      throw new Error("Unsupported chain type");
    },
    enabled,
    staleTime: 30_000,
    retry: 1,
  });

  return {
    fee: query.data?.fee ?? null,
    feeCurrency: query.data?.currency ?? null,
    feeRaw: query.data?.feeRaw ?? null,
    isLoading: query.isLoading && enabled,
    error: query.error?.message ?? null,
  };
}
