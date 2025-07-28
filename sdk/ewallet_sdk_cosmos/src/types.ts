import type {
  AccountData,
  AminoSignResponse,
  OfflineAminoSigner,
  StdSignature,
  StdSignDoc,
} from "@cosmjs/amino";
import {
  type DirectSignResponse,
  type OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import type {
  ChainInfo,
  KeplrSignOptions,
  Key,
  SettledResponses,
  SignDoc,
} from "@keplr-wallet/types";
import { type KeplrEWallet } from "@keplr-ewallet/ewallet-sdk-core";

import type { CosmosEWallet } from "@keplr-ewallet-sdk-cosmos/cosmos_ewallet";

export interface ICosmosEWallet {
  keplrEWallet: CosmosEWallet;
  signIn: (authType: Parameters<KeplrEWallet["signIn"]>[0]) => Promise<void>;

  enable: (chainId: string) => Promise<void>;
  experimentalSuggestChain: (chainInfo: ChainInfo) => Promise<void>;
  getAccounts: () => Promise<AccountData[]>;
  getKey: (chainId: string) => Promise<Key>;
  getKeysSettled: (chainIds: string[]) => Promise<SettledResponses<Key>>;
  getOfflineSigner: (
    chainId: string,
    signOptions?: KeplrSignOptions,
  ) => OfflineDirectSigner & OfflineAminoSigner;
  getOfflineSignerOnlyAmino: (
    chainId: string,
    signOptions?: KeplrSignOptions,
  ) => OfflineAminoSigner;
  getOfflineSignerAuto: (
    chainId: string,
    signOptions?: KeplrSignOptions,
  ) => Promise<OfflineDirectSigner | OfflineAminoSigner>;
  signAmino: (
    chainId: string,
    signer: string,
    signDoc: StdSignDoc,
    signOptions?: KeplrSignOptions,
  ) => Promise<AminoSignResponse>;
  signArbitrary: (
    chainId: string,
    signer: string,
    data: string | Uint8Array,
  ) => Promise<StdSignature>;
  signDirect: (
    chainId: string,
    signer: string,
    signDoc: SignDoc,
    signOptions?: KeplrSignOptions,
  ) => Promise<DirectSignResponse>;
  verifyArbitrary: (
    chainId: string,
    signer: string,
    data: string | Uint8Array,
    signature: StdSignature,
  ) => Promise<boolean>;
  sendTx: (
    chainId: string,
    tx: unknown,
    mode: "async" | "sync" | "block",
    options?: {
      silent?: boolean;
      onFulfill?: (tx: any) => void;
    },
  ) => Promise<Uint8Array>;
}
