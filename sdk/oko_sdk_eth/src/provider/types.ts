import type { AppCurrency, BIP44, EVMInfo } from "@keplr-wallet/types";
import type { AddEthereumChainParameter, Address, RpcError } from "viem";

import type { ProviderEventEmitter } from "./emitter";
import type {
  RpcMethod,
  RpcRequestArgs,
  RpcResponseData,
} from "@oko-wallet-sdk-eth/rpc";
import type { OkoEthSigner } from "@oko-wallet-sdk-eth/types";

export interface ProviderConnectInfo {
  chainId: string;
}

export type ProviderEventMap = {
  connect: ProviderConnectInfo;
  disconnect: RpcError;
  chainChanged: string;
  accountsChanged: Address[];
};

export type ProviderEvent = keyof ProviderEventMap;

export type ProviderEventHandlers = {
  connect: (info: ProviderConnectInfo) => void;
  disconnect: (error: RpcError) => void;
  chainChanged: (chainId: string) => void;
  accountsChanged: (accounts: Address[]) => void;
};

export type ProviderEventHandler<K extends ProviderEvent> = (
  payload: ProviderEventMap[K],
) => void;

export interface EIP1193Provider extends ProviderEventEmitter {
  request<M extends RpcMethod>(
    args: RpcRequestArgs<M>,
  ): Promise<RpcResponseData<M>>;
}

export type RpcChain = AddEthereumChainParameter;

export type OkoEthRpcChain = RpcChain & {
  readonly chainSymbolImageUrl?: string;
  readonly currencies?: AppCurrency[];
  readonly bip44?: BIP44;
  readonly features?: string[];
  readonly evm?: EVMInfo;
};

export type OkoEthRpcChainWithStatus = OkoEthRpcChain & {
  connected: boolean;
};

export type OkoEIP1193ProviderOptions = {
  chains: OkoEthRpcChain[];
  signer?: OkoEthSigner;
};
