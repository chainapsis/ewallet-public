"use client";

import { makeSignDoc as makeProtoSignDoc } from "@cosmjs/proto-signing";
import { Dec } from "@keplr-wallet/unit";
import { useOkoCosmos } from "@oko-wallet/oko-sdk-react/cosmos";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Buffer } from "buffer";

import { fetchCosmosAccount } from "@oko-wallet-user-dashboard/fetch/cosmos_account";
import { fetchFeemarketGasPrice } from "@oko-wallet-user-dashboard/fetch/cosmos_feemarket";
import { simulateCosmosGas } from "@oko-wallet-user-dashboard/fetch/cosmos_simulate_gas";
import type { CosmosChainInfo } from "@oko-wallet-user-dashboard/types/chain";
import {
  encodeAuthInfo,
  encodeSendTxBody,
  encodeTxRaw,
  encodeUnsignedTxForSimulate,
} from "@oko-wallet-user-dashboard/utils/cosmos_tx";

const FALLBACK_GAS = 300_000;
const FEEMARKET_GAS_ADJUSTMENT = 2.0;
const DEFAULT_GAS_ADJUSTMENT = 1.3;

export interface SendCosmosInput {
  chain: CosmosChainInfo;
  recipient: string;
  amount: string;
  denom: string;
  memo: string;
}

export interface SendCosmosResult {
  txHash: string;
}

export interface FeeEstimate {
  gasLimit: string;
  feeAmount: string;
  feeDenom: string;
}

function ceilDec(value: Dec): string {
  return value.roundUpDec().toString(0);
}

function getGasAdjustment(chain: CosmosChainInfo): number {
  return chain.features?.includes("feemarket")
    ? FEEMARKET_GAS_ADJUSTMENT
    : DEFAULT_GAS_ADJUSTMENT;
}

async function resolveGasPrice(
  chain: CosmosChainInfo,
  feeDenom: string,
  fallbackGasPrice: number,
): Promise<Dec> {
  if (chain.features?.includes("feemarket")) {
    const onChainPrice = await fetchFeemarketGasPrice(chain.rest, feeDenom);
    if (onChainPrice) {
      return new Dec(onChainPrice);
    }
  }
  return new Dec(fallbackGasPrice.toString());
}

async function estimateFee(params: {
  chain: CosmosChainInfo;
  senderPubKey: Uint8Array;
  sequence: string;
  bodyBytes: Uint8Array;
}): Promise<FeeEstimate> {
  const { chain, senderPubKey, sequence, bodyBytes } = params;
  const feeCurrency = chain.feeCurrencies[0];
  if (!feeCurrency) {
    throw new Error("Chain has no fee currencies");
  }
  const feeDenom = feeCurrency.coinMinimalDenom;
  const defaultGasPriceStep = feeCurrency.gasPriceStep?.average ?? 0.025;

  const simulateAuthInfo = encodeAuthInfo({
    pubKey: senderPubKey,
    sequence,
    gasLimit: String(FALLBACK_GAS),
    feeAmount: "0",
    feeDenom,
  });
  const simulateTxBytes = encodeUnsignedTxForSimulate(
    bodyBytes,
    simulateAuthInfo,
  );

  let gasUsed: number;
  try {
    gasUsed = await simulateCosmosGas(chain.rest, simulateTxBytes);
  } catch (error) {
    console.warn("simulate failed, using fallback gas", error);
    gasUsed = FALLBACK_GAS;
  }

  const gasAdjustment = getGasAdjustment(chain);
  const gasLimit = Math.ceil(gasUsed * gasAdjustment);
  const gasPrice = await resolveGasPrice(chain, feeDenom, defaultGasPriceStep);
  const feeAmount = ceilDec(new Dec(gasLimit.toString()).mul(gasPrice));

  return {
    gasLimit: gasLimit.toString(),
    feeAmount,
    feeDenom,
  };
}

async function runSendCosmos(
  okoCosmos: NonNullable<ReturnType<typeof useOkoCosmos>["cosmosWallet"]>,
  input: SendCosmosInput,
): Promise<SendCosmosResult> {
  const { chain, recipient, amount, denom, memo } = input;

  const account = await okoCosmos.getKey(chain.chainId);
  if (!account?.bech32Address) {
    throw new Error("Unable to resolve sender address");
  }

  const sender = account.bech32Address;
  const senderPubKey = account.pubKey;

  const bodyBytes = encodeSendTxBody({
    fromAddress: sender,
    toAddress: recipient,
    amount,
    denom,
    memo,
  });

  const accountInfo = await fetchCosmosAccount(chain.rest, sender);

  const fee = await estimateFee({
    chain,
    senderPubKey,
    sequence: accountInfo.sequence,
    bodyBytes,
  });

  const authInfoBytes = encodeAuthInfo({
    pubKey: senderPubKey,
    sequence: accountInfo.sequence,
    gasLimit: fee.gasLimit,
    feeAmount: fee.feeAmount,
    feeDenom: fee.feeDenom,
  });

  const signDoc = makeProtoSignDoc(
    bodyBytes,
    authInfoBytes,
    chain.chainId,
    Number.parseInt(accountInfo.accountNumber, 10),
  );

  const { signature, signed } = await okoCosmos.signDirect(
    chain.chainId,
    sender,
    signDoc,
  );

  const signatureBytes = Uint8Array.from(
    Buffer.from(signature.signature, "base64"),
  );
  const txBytes = encodeTxRaw(
    signed.bodyBytes,
    signed.authInfoBytes,
    signatureBytes,
  );

  const txHashBytes = await okoCosmos.sendTx(chain.chainId, txBytes, "sync");
  const txHash = Buffer.from(txHashBytes).toString("hex").toUpperCase();

  return { txHash };
}

export function useSendCosmos() {
  const { cosmosWallet: okoCosmos } = useOkoCosmos();
  const queryClient = useQueryClient();

  return useMutation<SendCosmosResult, Error, SendCosmosInput>({
    mutationFn: async (input) => {
      if (!okoCosmos) {
        throw new Error("Cosmos wallet is not ready");
      }
      return runSendCosmos(okoCosmos, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balances"] });
    },
  });
}

export { estimateFee };
