import type {
  AccountData,
  AminoSignResponse,
  OfflineAminoSigner,
  StdSignature,
  StdSignDoc,
} from "@cosmjs/amino";
import type {
  DirectSignResponse,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import type {
  ChainInfo,
  KeplrSignOptions,
  Key,
  SettledResponses,
} from "@keplr-wallet/types";
import type {
  EventEmitter3,
  MakeCosmosSigData,
  OkoWalletInitArgs,
  OkoWalletInterface,
  OpenModalAckPayload,
} from "@oko-wallet/oko-sdk-core";
import type { Result } from "@oko-wallet/stdlib-js";

import type {
  OkoCosmosWalletEvent2,
  OkoCosmosWalletEventHandler2,
} from "./event";
import type {
  LazyInitError,
  OkoCosmosWalletInitError,
} from "@oko-wallet-sdk-cosmos/errors";
import type { ArbitrarySigVerificationResult } from "@oko-wallet-sdk-cosmos/methods/verify_arbitrary";
import type { SignDoc } from "@oko-wallet-sdk-cosmos/types/sign";

export interface OkoCosmosWalletState {
  publicKey: Uint8Array | null;
  publicKeyRaw: string | null;
}

export interface OkoCosmosWalletStaticInterface {
  new (okoWallet: OkoWalletInterface): OkoCosmosWalletInterface;
  init: (
    args: OkoWalletInitArgs,
  ) => Result<OkoCosmosWalletInterface, OkoCosmosWalletInitError>;
}

export interface OkoCosmosWalletInterface {
  state: OkoCosmosWalletState;
  okoWallet: OkoWalletInterface;
  eventEmitter: EventEmitter3<
    OkoCosmosWalletEvent2,
    OkoCosmosWalletEventHandler2
  >;
  waitUntilInitialized: Promise<Result<OkoCosmosWalletState, LazyInitError>>;

  enable: (_chainId: string) => Promise<void>;
  on: (handlerDef: OkoCosmosWalletEventHandler2) => void;
  off: (handlerDef: OkoCosmosWalletEventHandler2) => void;
  getPublicKey: () => Promise<Uint8Array | null>;
  getCosmosChainInfo: () => Promise<ChainInfo[]>;
  experimentalSuggestChain: (_chainInfo: ChainInfo) => Promise<void>;
  getAccounts: () => Promise<AccountData[]>;
  getOfflineSigner: (
    chainId: string,
    signOptions?: KeplrSignOptions,
  ) => OfflineDirectSigner;

  getOfflineSignerOnlyAmino: (
    chainId: string,
    signOptions?: KeplrSignOptions,
  ) => OfflineAminoSigner;

  getOfflineSignerAuto: (
    chainId: string,
    signOptions?: KeplrSignOptions,
  ) => Promise<OfflineDirectSigner | OfflineAminoSigner>;

  getKey: (chainId: string) => Promise<Key>;

  getKeysSettled: (chainIds: string[]) => Promise<SettledResponses<Key>>;

  sendTx: (
    chainId: string,
    tx: unknown,
    mode: "async" | "sync" | "block",
  ) => Promise<Uint8Array>;

  signAmino: (
    chainId: string,
    signer: string,
    signDoc: StdSignDoc,
    signOptions?: KeplrSignOptions,
  ) => Promise<AminoSignResponse>;

  signDirect: (
    chainId: string,
    signer: string,
    signDoc: SignDoc,
    signOptions?: KeplrSignOptions,
  ) => Promise<DirectSignResponse>;

  signArbitrary: (
    chainId: string,
    signer: string,
    data: string | Uint8Array,
  ) => Promise<StdSignature>;

  verifyArbitrary: (
    chainId: string,
    signer: string,
    data: string | Uint8Array,
    signature: StdSignature,
  ) => Promise<ArbitrarySigVerificationResult>;

  openModal: (data: MakeCosmosSigData) => Promise<OpenModalAckPayload>;
}
