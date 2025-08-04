import { defaultErrorMessage, ErrorCodes } from "./constants";
import type { ErrorCode, StandardErrorOptions } from "./types";

const standardRpcError = {
  invalidInput: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.invalidInput,
      message:
        options.message ?? defaultErrorMessage[ErrorCodes.rpc.invalidInput],
      data: options.data,
    };
  },
  resourceNotFound: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.resourceNotFound,
      message:
        options.message ?? defaultErrorMessage[ErrorCodes.rpc.resourceNotFound],
      data: options.data,
    };
  },
  resourceUnavailable: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.resourceUnavailable,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.rpc.resourceUnavailable],
      data: options.data,
    };
  },
  transactionRejected: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.transactionRejected,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.rpc.transactionRejected],
      data: options.data,
    };
  },
  methodNotSupported: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.methodNotSupported,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.rpc.methodNotSupported],
      data: options.data,
    };
  },
  limitExceeded: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.limitExceeded,
      message:
        options.message ?? defaultErrorMessage[ErrorCodes.rpc.limitExceeded],
      data: options.data,
    };
  },
  versionNotSupported: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.versionNotSupported,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.rpc.versionNotSupported],
      data: options.data,
    };
  },
  invalidRequest: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.invalidRequest,
      message:
        options.message ?? defaultErrorMessage[ErrorCodes.rpc.invalidRequest],
      data: options.data,
    };
  },
  methodNotFound: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.methodNotFound,
      message:
        options.message ?? defaultErrorMessage[ErrorCodes.rpc.methodNotFound],
      data: options.data,
    };
  },
  invalidParams: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.invalidParams,
      message:
        options.message ?? defaultErrorMessage[ErrorCodes.rpc.invalidParams],
      data: options.data,
    };
  },
  internal: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.internal,
      message: options.message ?? defaultErrorMessage[ErrorCodes.rpc.internal],
      data: options.data,
    };
  },
  parse: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.rpc.parse,
      message: options.message ?? defaultErrorMessage[ErrorCodes.rpc.parse],
      data: options.data,
    };
  },
};

const standardProviderError = {
  userRejectedRequest: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.provider.userRejectedRequest,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.provider.userRejectedRequest],
      data: options.data,
    };
  },
  unauthorized: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.provider.unauthorized,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.provider.unauthorized],
      data: options.data,
    };
  },
  unsupportedMethod: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.provider.unsupportedMethod,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.provider.unsupportedMethod],
      data: options.data,
    };
  },
  disconnected: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.provider.disconnected,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.provider.disconnected],
      data: options.data,
    };
  },
  chainDisconnected: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.provider.chainDisconnected,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.provider.chainDisconnected],
      data: options.data,
    };
  },
  unsupportedChain: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.provider.unsupportedChain,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.provider.unsupportedChain],
      data: options.data,
    };
  },
};

const standardEthEWalletError = {
  invalidChainType: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.ethEWallet.invalidChainType,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.ethEWallet.invalidChainType],
    };
  },
  invalidSignType: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.ethEWallet.invalidSignType,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.ethEWallet.invalidSignType],
    };
  },
  publicKeyFetchFailed: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.ethEWallet.publicKeyFetchFailed,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.ethEWallet.publicKeyFetchFailed],
    };
  },
  invalidAddress: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.ethEWallet.invalidAddress,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.ethEWallet.invalidAddress],
    };
  },
  signatureFailed: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.ethEWallet.signatureFailed,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.ethEWallet.signatureFailed],
    };
  },
  signResultMismatch: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.ethEWallet.signResultMismatch,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.ethEWallet.signResultMismatch],
    };
  },
  invalidMessage: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.ethEWallet.invalidMessage,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.ethEWallet.invalidMessage],
    };
  },
  userRejectedRequest: <T>(options: StandardErrorOptions<T>) => {
    return {
      code: ErrorCodes.ethEWallet.userRejectedRequest,
      message:
        options.message ??
        defaultErrorMessage[ErrorCodes.ethEWallet.userRejectedRequest],
    };
  },
};

export const standardError = {
  rpc: standardRpcError,
  provider: standardProviderError,
  ethEWallet: standardEthEWalletError,
  from: <T>(code: ErrorCode, options: StandardErrorOptions<T>) => {
    return {
      code,
      message: options.message ?? defaultErrorMessage[code],
      data: options.data,
    };
  },
};
