import type {
  OkoWalletInitArgs,
  OkoWalletInterface,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Address, Hex } from "viem";

import type { OkoViemAccount } from "./account";
import type { EthSignParams, EthSignResult } from "./sign";
import type {
  LazyInitError,
  OkoEthWalletInitError,
} from "@oko-wallet-sdk-eth/errors";
import type { OkoEIP1193Provider } from "@oko-wallet-sdk-eth/provider";

export interface OkoEthWalletState {
  publicKey: Hex | null;
  address: Address | null;
  publicKeyRaw: string | null;
}

export type OkoEthWalletInitArgs = OkoWalletInitArgs;

export interface OkoEthWalletStaticInterface {
  new (okoWallet: OkoWalletInterface): OkoEthWalletInterface;
  init: (
    args: OkoEthWalletInitArgs,
  ) => Result<OkoEthWalletInterface, OkoEthWalletInitError>;
}

export interface OkoEthWalletInterface {
  state: OkoEthWalletState;
  okoWallet: OkoWalletInterface;
  provider: OkoEIP1193Provider | null;
  waitUntilInitialized: Promise<Result<OkoEthWalletState, LazyInitError>>;

  getEthereumProvider: () => Promise<OkoEIP1193Provider>;
  sign: (message: string) => Promise<Hex>;
  switchChain: (chainId: Hex | number) => Promise<void>;
  toViemAccount: () => Promise<OkoViemAccount>;
  getPublicKey: () => Promise<Hex>;
  getAddress: () => Promise<Hex>;
  makeSignature: (params: EthSignParams) => Promise<EthSignResult>;
}
