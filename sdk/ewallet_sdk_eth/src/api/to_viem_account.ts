import { type Address, type Hex, serializeTypedData } from "viem";

import type { EWalletAccount } from "@keplr-ewallet-sdk-eth/types";
import type { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";
import { toRpcTransactionRequest } from "@keplr-ewallet-sdk-eth/utils";

export async function toViemAccount(
  this: EthEWallet,
): Promise<EWalletAccount<"ewallet", Hex>> {
  const publicKey = await this.getPublicKey();
  const address = await this.getAddress();

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
      const result = await sign({
        type: "sign_transaction",
        data: {
          address,
          transaction: toRpcTransactionRequest(transaction),
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
          serializedTypedData: serializeTypedData(typedData),
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
