import { EventEmitter } from "eventemitter3";
import type { Address, AddEthereumChainParameter as Chain } from "viem";

import type {
  RpcMethod,
  RpcRequestArgs,
  RpcResponseData,
} from "@keplr-ewallet-sdk-eth/rpc";
import { RpcError } from "@keplr-ewallet-sdk-eth/rpc";
import type { EthSigner } from "@keplr-ewallet-sdk-eth/types";

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

export class ProviderEventEmitter extends EventEmitter<ProviderEvent> {
  on<K extends ProviderEvent>(
    event: K,
    handler: ProviderEventHandler<K>,
  ): this {
    return super.on(event, handler);
  }

  once<K extends ProviderEvent>(
    event: K,
    handler: ProviderEventHandler<K>,
  ): this {
    return super.once(event, handler);
  }

  off<K extends ProviderEvent>(
    event: K,
    handler: ProviderEventHandler<K>,
  ): this {
    return super.off(event, handler);
  }

  emit<K extends ProviderEvent>(
    event: K,
    payload: ProviderEventMap[K],
  ): boolean {
    return super.emit(event, payload);
  }

  addListener<K extends ProviderEvent>(
    event: K,
    handler: ProviderEventHandler<K>,
  ): this {
    return this.on(event, handler);
  }

  removeListener<K extends ProviderEvent>(
    event: K,
    handler: ProviderEventHandler<K>,
  ): this {
    return this.off(event, handler);
  }
}

export interface EIP1193Provider extends ProviderEventEmitter {
  request<M extends RpcMethod>(
    args: RpcRequestArgs<M>,
  ): Promise<RpcResponseData<M>>;
}

export type ChainValidationStatus = "pending" | "valid" | "invalid";

export type ChainWithStatus = Chain & {
  connected: boolean;
  validationStatus: ChainValidationStatus;
};

// CHECK: we might need to provide default values with specific chains
export type EWalletEIP1193ProviderOptions = {
  id: string;
  chains: Chain[];
  signer?: EthSigner;
};
