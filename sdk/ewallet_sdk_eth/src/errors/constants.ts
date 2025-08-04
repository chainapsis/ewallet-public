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

export const ErrorCodes = {
  rpc: RpcErrorCodes,
  provider: ProviderErrorCodes,
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

export const defaultErrorMessage: Record<ErrorCode, string> = {
  ...defaultRpcErrorMessage,
  ...defaultProviderErrorMessage,
};
