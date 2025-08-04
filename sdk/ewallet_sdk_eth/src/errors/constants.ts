import type { ErrorCode } from "./types";

export enum RpcErrorCodes {
  invalidInput = -32000,
  resourceNotFound = -32001,
  resourceUnavailable = -32002,
  transactionRejected = -32003,
  methodNotSupported = -32004,
  limitExceeded = -32005,
  versionNotSupported = -32006,
  invalidRequest = -32600,
  methodNotFound = -32601,
  invalidParams = -32602,
  internal = -32603,
  parse = -32700,
}

export enum ProviderErrorCodes {
  userRejectedRequest = 4001,
  unauthorized = 4100,
  unsupportedMethod = 4200,
  disconnected = 4900,
  chainDisconnected = 4901,
  unsupportedChain = 4902,
}

export enum EthEWalletErrorCodes {
  invalidChainType = 5000,
  invalidSignType = 5001,
  signatureFailed = 5100,
  signResultMismatch = 5101,
  invalidMessage = 5102,
  publicKeyFetchFailed = 5200,
  invalidAddress = 5201,
  userRejectedRequest = 5800,
}

export const ErrorCodes = {
  rpc: RpcErrorCodes,
  provider: ProviderErrorCodes,
  ethEWallet: EthEWalletErrorCodes,
};

const defaultRpcErrorMessage: Record<RpcErrorCodes, string> = {
  [RpcErrorCodes.invalidInput]: "Missing or invalid parameters",
  [RpcErrorCodes.resourceNotFound]: "Resource not found",
  [RpcErrorCodes.resourceUnavailable]: "Resource unavailable",
  [RpcErrorCodes.transactionRejected]: "Transaction rejected",
  [RpcErrorCodes.methodNotSupported]: "Method not supported",
  [RpcErrorCodes.limitExceeded]: "Rate limit exceeded",
  [RpcErrorCodes.versionNotSupported]: "JSON-RPC version not supported",
  [RpcErrorCodes.invalidRequest]: "Invalid request",
  [RpcErrorCodes.methodNotFound]: "Method not found",
  [RpcErrorCodes.invalidParams]: "Invalid params",
  [RpcErrorCodes.internal]: "Internal error",
  [RpcErrorCodes.parse]: "Failed to parse JSON-RPC response",
};

const defaultProviderErrorMessage: Record<ProviderErrorCodes, string> = {
  [ProviderErrorCodes.userRejectedRequest]: "User rejected request",
  [ProviderErrorCodes.unauthorized]: "Unauthorized",
  [ProviderErrorCodes.unsupportedMethod]: "Unsupported method",
  [ProviderErrorCodes.disconnected]: "Disconnected",
  [ProviderErrorCodes.chainDisconnected]: "Chain disconnected",
  [ProviderErrorCodes.unsupportedChain]: "Unsupported chain",
};

const defaultEthEWalletErrorMessage: Record<EthEWalletErrorCodes, string> = {
  [EthEWalletErrorCodes.invalidChainType]: "Invalid chain type",
  [EthEWalletErrorCodes.invalidSignType]: "Invalid sign type",
  [EthEWalletErrorCodes.publicKeyFetchFailed]: "Failed to fetch public key",
  [EthEWalletErrorCodes.invalidAddress]:
    "Invalid address, please check the public key is valid hex string",
  [EthEWalletErrorCodes.signatureFailed]: "Failed to sign",
  [EthEWalletErrorCodes.signResultMismatch]: "Sign result mismatch",
  [EthEWalletErrorCodes.invalidMessage]: "Invalid message",
  [EthEWalletErrorCodes.userRejectedRequest]: "User rejected the request",
};

export const defaultErrorMessage: Record<ErrorCode, string> = {
  ...defaultRpcErrorMessage,
  ...defaultProviderErrorMessage,
  ...defaultEthEWalletErrorMessage,
};
