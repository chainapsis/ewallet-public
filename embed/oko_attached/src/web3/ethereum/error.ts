import {
  ChainDisconnectedError,
  EstimateGasExecutionError,
  HttpRequestError,
  InsufficientFundsError,
  InvalidInputRpcError,
  InvalidParamsRpcError,
  LimitExceededRpcError,
  MethodNotFoundRpcError,
  MethodNotSupportedRpcError,
  ProviderDisconnectedError,
  RpcRequestError,
  TimeoutError,
  TransactionExecutionError,
  TransactionRejectedRpcError,
  UnknownRpcError,
  UserRejectedRequestError,
  WebSocketRequestError,
} from "viem";

import type { StructuredRpcError } from "./queries/types";

function extractRpcErrorCode(
  err: unknown,
  maxDepth: number = 4,
): number | string | undefined {
  const anyErr = (err as any) ?? {};

  if (typeof anyErr.code === "number" || typeof anyErr.code === "string") {
    return anyErr.code;
  }

  // viem has nested error structure, so we need to traverse the error chain to find the code
  let cur: any = anyErr;
  for (let i = 0; i < maxDepth; i++) {
    if (!cur) {
      break;
    }

    if (typeof cur.code === "number" || typeof cur.code === "string") {
      return cur.code;
    }

    cur =
      cur?.cause ??
      cur?.__cause ??
      cur?.originalError ??
      cur?.innerError ??
      cur?.error ??
      cur?.err ??
      cur?.source ??
      null;
  }

  if (anyErr?.details?.code) {
    return anyErr.details.code;
  }
  if (anyErr?.data?.code) {
    return anyErr.data.code;
  }
  if (anyErr?.error?.code) {
    return anyErr.error.code;
  }

  // find code pattern in message
  const msg = String(anyErr?.message ?? anyErr ?? "");
  const m =
    msg.match(/"code"\s*:\s*(-?\d+)/) ?? msg.match(/code[:=]\s*(-?\d+)/i);
  if (m) {
    return Number(m[1]);
  }

  return undefined;
}

export function classifyViemErrorDetailed(err: unknown): StructuredRpcError {
  const isErr = err instanceof Error;
  const msg = isErr ? (err as Error).message : String(err);
  const anyErr = (err as any) ?? {};
  const rpcCode = extractRpcErrorCode(err);
  const name = anyErr?.name ?? (isErr ? err.name : undefined);

  function createErrorResult(
    category: StructuredRpcError["category"],
    userMessage?: string,
    retryable = false,
  ): StructuredRpcError {
    return {
      category,
      message: msg,
      userMessage,
      retryable,
      raw: err,
      name,
      rpcCode,
    };
  }

  // 1. Type/Code-based error classification
  try {
    // Network-related errors (retryable)
    if (
      err instanceof RpcRequestError ||
      err instanceof HttpRequestError ||
      err instanceof WebSocketRequestError
    ) {
      return createErrorResult(
        "NETWORK",
        "Cannot connect to the network or RPC endpoint. Please try again later",
        true,
      );
    }

    if (err instanceof TimeoutError) {
      return createErrorResult(
        "TIMEOUT",
        "Request timed out. Please try again later",
        true,
      );
    }

    if (
      err instanceof ProviderDisconnectedError ||
      err instanceof ChainDisconnectedError
    ) {
      return createErrorResult(
        "NETWORK",
        "Wallet connection was lost. Please check the connection",
        true,
      );
    }

    if (err instanceof LimitExceededRpcError) {
      return createErrorResult(
        "RATE_LIMITED",
        "Request limit exceeded. Please try again later",
        true,
      );
    }

    // Non-retryable RPC errors
    if (err instanceof InsufficientFundsError) {
      return createErrorResult("INSUFFICIENT_BALANCE", undefined, false);
    }

    if (err instanceof EstimateGasExecutionError) {
      const cause = (err as any).cause;
      if (
        cause &&
        (cause instanceof InsufficientFundsError ||
          /insufficient funds/i.test(String(cause?.message)))
      ) {
        return createErrorResult("INSUFFICIENT_BALANCE", undefined, false);
      }
      return createErrorResult("RPC", undefined, false);
    }

    if (
      err instanceof InvalidInputRpcError ||
      err instanceof InvalidParamsRpcError ||
      err instanceof TransactionExecutionError ||
      err instanceof TransactionRejectedRpcError
    ) {
      return createErrorResult("RPC", undefined, false);
    }

    // Unsupported method errors
    if (
      err instanceof MethodNotFoundRpcError ||
      err instanceof MethodNotSupportedRpcError
    ) {
      return createErrorResult("UNSUPPORTED", undefined, false);
    }

    // User rejection
    if (err instanceof UserRejectedRequestError) {
      return createErrorResult("UNKNOWN", "User rejected the request", false);
    }

    // Unknown RPC error
    if (err instanceof UnknownRpcError) {
      return createErrorResult("UNKNOWN", undefined, false);
    }
  } catch {}

  // 2. Pattern-based error classification
  const errorPatterns = [
    // Insufficient funds
    {
      pattern: /insufficient funds/i,
      handler: () => createErrorResult("RPC", undefined, false),
    },
    // Invalid parameters
    {
      pattern:
        /Missing or invalid parameters|Invalid parameters|Invalid input/i,
      handler: () => createErrorResult("RPC", undefined, false),
      rpcCodes: [-32602, -32000],
    },
    // Method not found
    {
      pattern: /method not found/i,
      handler: () => createErrorResult("UNSUPPORTED", undefined, false),
      rpcCodes: [-32601],
    },
    // Rate limiting
    {
      pattern: /rate limit|too many requests|429/i,
      handler: () =>
        createErrorResult(
          "RATE_LIMITED",
          "Request limit exceeded. Please try again later",
          true,
        ),
      rpcCodes: [429, -32005],
    },
    // Network errors
    {
      pattern: /failed to fetch|network error|fetch error/i,
      handler: () =>
        createErrorResult(
          "NETWORK",
          "Network connection error. Please try again later",
          true,
        ),
      nameCheck: "TypeError",
    },
    // User rejection
    {
      pattern: /rejected/i,
      handler: () => createErrorResult("UNKNOWN", undefined, false),
      rpcCodes: [4001],
    },
  ];

  // Check patterns
  for (const { pattern, handler, rpcCodes, nameCheck } of errorPatterns) {
    const matchesPattern = pattern.test(msg);
    const matchesRpcCode =
      rpcCodes && rpcCode !== undefined && typeof rpcCode === "number"
        ? rpcCodes.includes(rpcCode)
        : false;
    const matchesName = nameCheck && anyErr?.name === nameCheck;

    if (matchesPattern || matchesRpcCode || matchesName) {
      return handler();
    }
  }

  // Default case
  return createErrorResult("UNKNOWN", undefined, false);
}
