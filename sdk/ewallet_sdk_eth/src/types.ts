import type {
  Address,
  CustomSource,
  Hex,
  Prettify,
  SignableMessage,
  TypedDataDefinition,
  TransactionSerializable,
} from "viem";

import type { EIP1193Provider } from "@keplr-ewallet-sdk-eth/provider";

export interface EthSignMethodMap {
  sign_transaction: {
    params: {
      type: "sign_transaction";
      data: {
        address: Address;
        transaction: TransactionSerializable;
      };
    };
    result: { type: "signed_transaction"; signedTransaction: Hex };
  };
  personal_sign: {
    params: {
      type: "personal_sign";
      data: {
        address: Address;
        message: SignableMessage;
      };
    };
    result: { type: "signature"; signature: Hex };
  };
  sign_typedData_v4: {
    params: {
      type: "sign_typedData_v4";
      data: {
        address: Address;
        message: TypedDataDefinition;
      };
    };
    result: { type: "signature"; signature: Hex };
  };
}

export type EthSignMethod = keyof EthSignMethodMap;

export type SignFunctionParams<M extends EthSignMethod> =
  EthSignMethodMap[M]["params"];
export type SignFunctionResult<M extends EthSignMethod> =
  EthSignMethodMap[M]["result"];

/**
 * Sign function
 * @param parameters - Sign function parameters
 * @returns Sign function result
 */
export type SignFunction = <M extends EthSignMethod>(
  parameters: SignFunctionParams<M>,
) => Promise<SignFunctionResult<M>>;

/**
 * Configuration for Ewallet signer
 * TODO: This is a temporary interface to be replaced with the actual signer interface
 * There needs user interaction to sign a message, transaction, or typed data
 * In example, a new popup window needs to be opened to sign a message with original data displayed
 */
export interface EthSigner {
  address: Hex;
  sign: SignFunction;
}

/**
 * Ewallet account type
 * This is a viem compatible account type
 */
export type EWalletAccount<
  source extends string = string,
  address extends Address = Address,
> = Prettify<
  CustomSource & {
    address: address;
    publicKey: Hex;
    source: source;
    type: "local";
  }
>;

export interface IEthEWallet {
  type: "ethereum";
  chainId: string; // CAIP-2 formatting
  address: Hex;
  /**
   * @returns EIP-1193 compatible Ethereum provider
   */
  getEthereumProvider: () => Promise<EIP1193Provider>;
  /**
   * Execute `personal_sign` operation with user wallet
   *
   * @param msg - Message to sign in hex format
   * @returns Signature of the message in hex format
   */
  sign: (msg: string) => Promise<Hex>;
  /**
   * Switch to the specified chain
   * The chain must be supported by the wallet
   *
   * @param chainId - Chain ID to switch to in hex string or number
   */
  switchChain: (chainId: `0x${string}` | number) => Promise<void>;
}
