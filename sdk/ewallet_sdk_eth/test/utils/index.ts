import type { AddEthereumChainParameter, Hex } from "viem";
import {
  keccak256,
  hashMessage,
  serializeTransaction,
  toHex,
  hashTypedData,
  parseSignature,
} from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import { hardhat } from "../hardhat";
import { VERSION } from "@keplr-ewallet-sdk-eth/provider";
import type {
  EthSigner,
  EthSignMethod,
  SignFunction,
  SignFunctionParams,
  SignFunctionResult,
} from "@keplr-ewallet-sdk-eth/types";
import {
  parseTypedDataDefinition,
  toTransactionSerializable,
} from "@keplr-ewallet-sdk-eth/utils";

export * from "./viemHelpers";
export * from "./ethersHelpers";

// Constants
export const DUMMY_PROVIDER_ID = "123e4567-e89b-12d3-a456-426614174000";
export const DUMMY_ADDRESS = "0x1234567890123456789012345678901234567890";
export const EXPECTED_VERSION = VERSION;
export const EXPECTED_NAME = "EWalletEIP1193Provider";

export const COUNTER_ABI = [
  {
    type: "function",
    name: "increment",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "number",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setNumber",
    inputs: [{ name: "newNumber", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const COUNTER_DEPLOYMENT_BYTECODE =
  "0x6080604052348015600e575f5ffd5b506101e18061001c5f395ff3fe608060405234801561000f575f5ffd5b506004361061003f575f3560e01c80633fb5c1cb146100435780638381f58a1461005f578063d09de08a1461007d575b5f5ffd5b61005d600480360381019061005891906100e4565b610087565b005b610067610090565b604051610074919061011e565b60405180910390f35b610085610095565b005b805f8190555050565b5f5481565b5f5f8154809291906100a690610164565b9190505550565b5f5ffd5b5f819050919050565b6100c3816100b1565b81146100cd575f5ffd5b50565b5f813590506100de816100ba565b92915050565b5f602082840312156100f9576100f86100ad565b5b5f610106848285016100d0565b91505092915050565b610118816100b1565b82525050565b5f6020820190506101315f83018461010f565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016e826100b1565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036101a05761019f610137565b5b60018201905091905056fea264697066735822122037ad68ebe8f3853c8fa6cfe7296c8c5c7240233bdc0835097ec7a021cd787c0964736f6c634300081d0033" as Hex;

// Test fixtures
export const createChainParam = (
  chain: typeof mainnet | typeof hardhat,
): AddEthereumChainParameter => ({
  chainId: toHex(chain.id),
  chainName: chain.name,
  rpcUrls: chain.rpcUrls.default.http,
  nativeCurrency: chain.nativeCurrency,
  blockExplorerUrls: chain.blockExplorers?.default.url
    ? [chain.blockExplorers.default.url]
    : [],
});

// Create a dummy signer for testing
export const createDummySigner = (): EthSigner => {
  return {
    address: DUMMY_ADDRESS,
    sign: async function <M extends EthSignMethod>(
      parameters: SignFunctionParams<M>,
    ): Promise<SignFunctionResult<M>> {
      switch (parameters.type) {
        case "sign_transaction": {
          return {
            type: "signed_transaction",
            signedTransaction:
              "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
          };
        }
        case "personal_sign": {
          return {
            type: "signature",
            signature:
              "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
          };
        }
        case "sign_typedData_v4": {
          return {
            type: "signature",
            signature:
              "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          };
        }
        default:
          throw new Error(`Unknown sign type: ${(parameters as any).type}`);
      }
    } as SignFunction,
  };
};

/**
 * Create an Ethereum signer for testing
 * @param privateKey - The private key to use for signing
 * @returns An Ethereum signer that can sign transactions, personal messages, and typed data
 * @dev signHash function is not part of the EthSigner interface, but is added for testing purposes
 */
export const createEthSigner = (
  chainId: number | string,
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
          const serializableTx = toTransactionSerializable({
            chainId: chainId.toString(),
            tx: transaction,
          });
          const serializedTx = serializeTransaction(serializableTx);
          const hash = keccak256(serializedTx);
          const signature = await account.sign({ hash });
          const signedTransaction = serializeTransaction(
            serializableTx,
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
          const { serializedTypedData } = parameters.data;
          const typedData = parseTypedDataDefinition(serializedTypedData);
          const hash = hashTypedData(typedData);
          const signature = await account.sign({ hash });
          return {
            type: "signature",
            signature,
          };
        }
        default:
          throw new Error(`Unknown sign type: ${(parameters as any).type}`);
      }
    } as SignFunction,
    signHash: async ({ hash }: { hash: Hex }): Promise<Hex> => {
      return await account.sign({ hash });
    },
  };
};

export const createProviderOptions = (
  chains: AddEthereumChainParameter[],
  signer?: EthSigner,
) => ({
  id: DUMMY_PROVIDER_ID,
  signer,
  chains,
});

// Test Data Generators
export const generateRandomAddress = (): `0x${string}` => {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;
};

export const generateInvalidBytecode = (): Hex => {
  // Invalid bytecode that would fail during deployment
  return "0xdeadbeef" as Hex;
};
