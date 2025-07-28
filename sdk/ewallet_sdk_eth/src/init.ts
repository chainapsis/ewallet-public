import type { KeplrEWallet } from "@keplr-ewallet/ewallet-sdk-core";
import {
  type Hex,
  hashMessage,
  keccak256,
  serializeTransaction,
  hashTypedData,
  parseSignature,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import type {
  EthSigner,
  SignFunctionParams,
  SignFunctionResult,
  EthSignMethod,
} from "@keplr-ewallet-sdk-eth/types";
import { EthEWallet } from "@keplr-ewallet-sdk-eth/eth_ewallet";

export interface InitEthEWalletArgs {
  eWallet: KeplrEWallet | null;
  initialChainId?: string | number;
}

export async function initEthEWallet({
  eWallet,
  initialChainId,
}: InitEthEWalletArgs): Promise<EthEWallet | null> {
  if (eWallet === null) {
    return null;
  }

  const ethEWallet = new EthEWallet(eWallet);
  await ethEWallet.initialize(initialChainId);
  return ethEWallet;
}

/**
 * Create an Ethereum local signer for testing purposes
 * TODO: remove this function after testing
 * @param privateKey - The private key to use for signing
 * @returns An Ethereum signer that can sign transactions, personal messages, and typed data
 * @dev signHash function is not part of the EthSigner interface, but is added for testing purposes
 */
export const createEthLocalSigner = (
  privateKey: Hex,
): EthSigner & { signHash: ({ hash }: { hash: Hex }) => Promise<Hex> } => {
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    sign: async function <M extends EthSignMethod>(
      parameters: SignFunctionParams<M>,
    ): Promise<SignFunctionResult<M>> {
      switch (parameters.type) {
        case "sign_transaction": {
          const { transaction } = parameters.data;
          const serializedTx = serializeTransaction(transaction);
          const hash = keccak256(serializedTx);
          const signature = await account.sign({ hash });
          const signedTransaction = serializeTransaction(
            transaction,
            parseSignature(signature),
          );
          return {
            type: "signed_transaction",
            signedTransaction,
          };
        }
        case "personal_sign": {
          const { message } = parameters.data;
          const hash = hashMessage(message);
          const signature = await account.sign({ hash });
          return {
            type: "signature",
            signature,
          };
        }
        case "sign_typedData_v4": {
          const { message } = parameters.data;
          const hash = hashTypedData(message);
          const signature = await account.sign({ hash });
          return {
            type: "signature",
            signature,
          };
        }
        default:
          throw new Error(`Unknown sign type: ${(parameters as any).type}`);
      }
    },
    signHash: async ({ hash }: { hash: Hex }): Promise<Hex> => {
      return await account.sign({ hash });
    },
  };
};
