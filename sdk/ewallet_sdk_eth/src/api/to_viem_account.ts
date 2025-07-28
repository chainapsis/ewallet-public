import { isAddress } from "viem";
import type { Address, Hex, TypedDataDefinition } from "viem";
import { publicKeyToAddress } from "viem/accounts";

import type { EWalletAccount } from "@keplr-ewallet-sdk-eth/types";
import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";

export async function toViemAccount(
  this: EthEWallet,
): Promise<EWalletAccount<"ewallet", Hex>> {
  const publicKey = await this.getPublicKey();
  const address = publicKeyToAddress(publicKey as `0x${string}`);

  if (!address || !isAddress(address)) {
    throw new Error("Invalid address format");
  }

  const sign = this.makeSignature;

  const account: EWalletAccount<"ewallet", Address> = {
    address,
    type: "local",
    source: "ewallet",
    publicKey,

    signMessage: async ({ message }) => {
      const result = await sign({
        type: "personal_sign",
        data: {
          address,
          message,
        },
      });

      if (result.type !== "signature") {
        throw new Error("Expected signature result");
      }

      return result.signature;
    },

    signTransaction: async (transaction) => {
      const signableTransaction = (() => {
        // For EIP-4844 Transactions, we want to sign the transaction payload body (tx_payload_body) without the sidecars (ie. without the network wrapper).
        // See: https://github.com/ethereum/EIPs/blob/e00f4daa66bd56e2dbd5f1d36d09fd613811a48b/EIPS/eip-4844.md#networking
        if (transaction.type === "eip4844")
          return {
            ...transaction,
            sidecars: false,
          };
        return transaction;
      })();

      const result = await sign({
        type: "sign_transaction",
        data: {
          address,
          transaction: signableTransaction,
        },
      });

      if (result.type !== "signed_transaction") {
        throw new Error("Expected signed transaction result");
      }

      return result.signedTransaction;
    },

    signTypedData: async (typedData) => {
      const result = await sign({
        type: "sign_typedData_v4",
        data: {
          address,
          message: typedData as TypedDataDefinition,
        },
      });

      if (result.type !== "signature") {
        throw new Error("Expected signature result");
      }

      return result.signature;
    },
  };

  return account satisfies EWalletAccount<"ewallet", Address>;
}
