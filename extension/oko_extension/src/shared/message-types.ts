/**
 * Message types for extension communication
 *
 * Flow:
 * dApp (window) → Content Script → Background (Service Worker) → oko_attached
 */

// Base message structure
export interface ExtensionMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
}

// Response wrapper
export interface ExtensionResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
}

// ============== EVM Message Types ==============

export type EvmRequestMethod =
  | "eth_requestAccounts"
  | "eth_accounts"
  | "eth_chainId"
  | "eth_sendTransaction"
  | "eth_signTransaction"
  | "personal_sign"
  | "eth_signTypedData_v4"
  | "wallet_switchEthereumChain"
  | "wallet_addEthereumChain"
  | "web3_clientVersion";

export interface EvmRpcRequest {
  method: EvmRequestMethod | string;
  params?: unknown[];
}

export interface EvmProviderMessage extends ExtensionMessage<EvmRpcRequest> {
  type: "EVM_RPC_REQUEST";
  chainType: "evm";
}

// ============== SVM (Solana) Message Types ==============

export type SvmRequestMethod =
  | "connect"
  | "disconnect"
  | "signMessage"
  | "signTransaction"
  | "signAllTransactions"
  | "signAndSendTransaction";

export interface SvmRequest {
  method: SvmRequestMethod;
  params?: unknown;
}

export interface SvmProviderMessage extends ExtensionMessage<SvmRequest> {
  type: "SVM_REQUEST";
  chainType: "svm";
}

// ============== Cosmos Message Types ==============

export type CosmosRequestMethod =
  | "enable"
  | "getKey"
  | "getKeysSettled"
  | "signAmino"
  | "signDirect"
  | "signArbitrary"
  | "sendTx"
  | "experimentalSuggestChain"
  | "getOfflineSigner"
  | "getOfflineSignerOnlyAmino"
  | "getOfflineSignerAuto";

export interface CosmosRequest {
  method: CosmosRequestMethod;
  params?: unknown;
}

export interface CosmosProviderMessage extends ExtensionMessage<CosmosRequest> {
  type: "COSMOS_REQUEST";
  chainType: "cosmos";
}

// ============== Background State Types ==============

export interface WalletState {
  isConnected: boolean;
  evmAddress: string | null;
  svmPublicKey: string | null;
  cosmosPublicKey: string | null;
}

// ============== Internal Messages ==============

export interface GetStateMessage extends ExtensionMessage<null> {
  type: "GET_STATE";
}

export interface OpenOkoAttachedMessage extends ExtensionMessage<{ url?: string }> {
  type: "OPEN_OKO_ATTACHED";
}

export interface DisconnectMessage extends ExtensionMessage<null> {
  type: "DISCONNECT";
}

export interface StateUpdateMessage extends ExtensionMessage<WalletState> {
  type: "STATE_UPDATE";
}

export interface OkoAttachedMessagePayload {
  type: string;
  requestId: string;
  payload?: unknown;
  error?: string;
}

export interface OkoAttachedMessage extends ExtensionMessage<OkoAttachedMessagePayload> {
  type: "OKO_ATTACHED_MESSAGE";
}

// ============== Window PostMessage Types ==============

export interface WindowMessage {
  target: string;
  id: string;
  type: string;
  payload: unknown;
}

// Union of all provider messages
export type ProviderMessage =
  | EvmProviderMessage
  | SvmProviderMessage
  | CosmosProviderMessage
  | GetStateMessage
  | OpenOkoAttachedMessage
  | DisconnectMessage
  | OkoAttachedMessage;
