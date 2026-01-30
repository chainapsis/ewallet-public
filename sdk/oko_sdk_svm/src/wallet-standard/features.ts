import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import type { IdentifierString } from "@wallet-standard/base";
import bs58 from "bs58";

import type { WalletStandardConfig } from "./chains";
import type { OkoSvmWalletInterface } from "@oko-wallet-sdk-svm/types";

const SUPPORTED_TRANSACTION_VERSIONS = ["legacy", 0] as const;

function deserializeTransaction(
  bytes: Uint8Array,
): Transaction | VersionedTransaction {
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
}

export function createSignMessageFeature(
  wallet: OkoSvmWalletInterface,
  featureKey: IdentifierString,
): Record<string, unknown> {
  return {
    [featureKey]: {
      version: "1.0.0",
      signMessage: async (...inputs: { message: Uint8Array }[]) => {
        const outputs = [];
        for (const input of inputs) {
          const signature = await wallet.signMessage(input.message);
          outputs.push({ signedMessage: input.message, signature });
        }
        return outputs;
      },
    },
  };
}

export function createSignTransactionFeature(
  wallet: OkoSvmWalletInterface,
  featureKey: IdentifierString,
  config: WalletStandardConfig,
): Record<string, unknown> {
  return {
    [featureKey]: {
      version: "1.0.0",
      supportedTransactionVersions: SUPPORTED_TRANSACTION_VERSIONS,
      signTransaction: async (
        ...inputs: { transaction: Uint8Array; chain?: string }[]
      ) => {
        const outputs = [];
        for (const input of inputs) {
          if (
            input.chain &&
            !config.chains.includes(input.chain as IdentifierString)
          ) {
            throw new Error(`Unsupported chain: ${input.chain}`);
          }
          const transaction = deserializeTransaction(input.transaction);
          const signedTransaction = await wallet.signTransaction(transaction);
          outputs.push({ signedTransaction: signedTransaction.serialize() });
        }
        return outputs;
      },
    },
  };
}

export function createSignAndSendTransactionFeature(
  wallet: OkoSvmWalletInterface,
  featureKey: IdentifierString,
  config: WalletStandardConfig,
): Record<string, unknown> {
  const getConnection = (chain?: string): Connection => {
    const targetChain = chain ? (chain as IdentifierString) : config.chains[0];
    const endpoint = config.rpcEndpoints?.[targetChain];
    if (!endpoint) {
      throw new Error(`No RPC endpoint for chain: ${targetChain}`);
    }
    return new Connection(endpoint);
  };

  return {
    [featureKey]: {
      version: "1.0.0",
      supportedTransactionVersions: SUPPORTED_TRANSACTION_VERSIONS,
      signAndSendTransaction: async (
        ...inputs: {
          transaction: Uint8Array;
          chain?: string;
          options?: { skipPreflight?: boolean };
        }[]
      ) => {
        const outputs = [];
        for (const input of inputs) {
          if (
            input.chain &&
            !config.chains.includes(input.chain as IdentifierString)
          ) {
            throw new Error(`Unsupported chain: ${input.chain}`);
          }
          const transaction = deserializeTransaction(input.transaction);
          const connection = getConnection(input.chain);
          const { signature } = await wallet.signAndSendTransaction(
            transaction,
            connection,
            input.options,
          );
          outputs.push({ signature: bs58.decode(signature) });
        }
        return outputs;
      },
    },
  };
}
