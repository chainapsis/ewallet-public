import { serializeTypedData } from "viem";

import type {
  EthSignParams,
  OkoEthWalletInterface,
  OkoViemAccount,
} from "@oko-wallet-sdk-eth/types";
import { toRpcTransactionRequest } from "@oko-wallet-sdk-eth/utils";

export async function toViemAccount(
  this: OkoEthWalletInterface,
): Promise<OkoViemAccount> {
  await this.waitUntilInitialized;

  const publicKey = await this.getPublicKey();
  const address = await this.getAddress();

  const sign = (params: EthSignParams) => this.makeSignature(params);

  const account: OkoViemAccount = {
    address,
    type: "local",
    source: "oko_wallet",
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
        throw new Error("Invalid result type");
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
        throw new Error("Invalid result type");
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
        throw new Error("Invalid result type");
      }

      return result.signature;
    },
  };

  return account;
}
