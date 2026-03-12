import type { Hex, RpcTransactionRequest, TransactionSerializable } from "viem";
import { isHex, toHex } from "viem";

import { parseChainId } from "./utils";

/**
 * Normalize Ethereum JSON-RPC QUANTITY values to 0x-prefixed hex without leading zeros
 * @param input - The input to normalize
 * @returns The normalized value
 */
function normalizeQuantity(
  input: string | number | bigint | null | undefined,
): Hex | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }

  if (typeof input === "bigint") {
    return toHex(input);
  }

  if (typeof input === "number") {
    const n = Number.isFinite(input) ? Math.max(0, Math.floor(input)) : 0;
    return toHex(n);
  }

  const s = input.trim();
  if (s.length === 0 || s === "0x") {
    return undefined;
  }

  let q: bigint;
  try {
    q = BigInt(s);
  } catch {
    try {
      const hexCandidate = isHex(s) ? s : `0x${s}`;
      q = BigInt(hexCandidate);
    } catch {
      return undefined;
    }
  }

  return toHex(q);
}

function normalizeDataHex(input: string | undefined | null): Hex | undefined {
  if (input === null || input === undefined) {
    return undefined;
  }
  let s = input.trim();
  if (s.length === 0) {
    return undefined;
  }
  if (!isHex(s)) {
    s = `0x${s}`;
  }
  return s as `0x${string}`;
}

/**
 * Normalize a transaction to be signable
 * @param tx - The transaction to normalize
 * @returns The normalized transaction
 * @dev Currently, we do not support blob and EIP-7702, so we ignore related fields
 */
export function toSignableTransaction(
  tx: RpcTransactionRequest,
): RpcTransactionRequest {
  const copy = tx;

  const signable: RpcTransactionRequest = {
    to: copy.to,
    data: normalizeDataHex(copy.data),
    value: normalizeQuantity(copy.value),
    nonce: normalizeQuantity(copy.nonce),
    gas: normalizeQuantity(copy.gas),
    accessList: copy.accessList,
    // ignore other fields as we do not support blob and EIP-7702 yet
  };

  const gasPrice = normalizeQuantity(copy.gasPrice);
  const maxFeePerGas = normalizeQuantity(copy.maxFeePerGas);
  const maxPriorityFeePerGas = normalizeQuantity(copy.maxPriorityFeePerGas);

  const isLegacy = gasPrice !== undefined && isHex(gasPrice);
  const isEIP1559 =
    maxFeePerGas !== undefined &&
    maxPriorityFeePerGas !== undefined &&
    isHex(maxFeePerGas) &&
    isHex(maxPriorityFeePerGas);

  if (isEIP1559) {
    signable.maxFeePerGas = maxFeePerGas;
    signable.maxPriorityFeePerGas = maxPriorityFeePerGas;
  } else if (isLegacy) {
    signable.gasPrice = gasPrice;
  }

  return signable;
}

/**
 * Check if a transaction is properly simulated by the client
 * @param tx - The transaction to check
 * @returns True if the transaction is signable, false otherwise
 */
export function isSignableTransaction(tx: RpcTransactionRequest): boolean {
  if (!tx || typeof tx !== "object") {
    return false;
  }

  const hasGas = tx.gas != null && isHex(tx.gas);
  const isLegacy = tx.gasPrice != null && isHex(tx.gasPrice);
  const isEIP1559 =
    tx.maxFeePerGas != null &&
    tx.maxPriorityFeePerGas != null &&
    isHex(tx.maxFeePerGas) &&
    isHex(tx.maxPriorityFeePerGas);

  return hasGas && (isEIP1559 || isLegacy);
}

export function toTransactionSerializable({
  chainId,
  tx,
}: {
  chainId: string;
  tx: RpcTransactionRequest;
}): TransactionSerializable {
  const convertValue = <T>(
    value: string | number | undefined,
    converter: (value: string | number) => T,
    defaultValue?: T,
  ): T | undefined => (value !== undefined ? converter(value) : defaultValue);

  const copy = tx;

  const chainIdNumber = parseChainId(chainId);

  const serializable: TransactionSerializable = {
    chainId: chainIdNumber,
    to: copy.to || null,
    data: copy.data,
    gas: convertValue(copy.gas, BigInt),
    nonce: convertValue(copy.nonce, (value) => parseInt(value.toString(), 16)),
    value: convertValue(copy.value, BigInt),
  };

  const gasPrice = convertValue(copy.gasPrice, BigInt);
  const maxFeePerGas = convertValue(copy.maxFeePerGas, BigInt);
  const maxPriorityFeePerGas = convertValue(copy.maxPriorityFeePerGas, BigInt);

  const isLegacy = gasPrice !== undefined;
  const isEIP1559 =
    maxFeePerGas !== undefined && maxPriorityFeePerGas !== undefined;

  if (isEIP1559) {
    serializable.type = "eip1559";
    serializable.maxFeePerGas = maxFeePerGas;
    serializable.maxPriorityFeePerGas = maxPriorityFeePerGas;
  } else if (isLegacy) {
    if (copy.accessList != null && copy.accessList.length > 0) {
      serializable.type = "eip2930";
      serializable.accessList = copy.accessList;
    } else {
      serializable.type = "legacy";
      serializable.gasPrice = gasPrice;
    }
  }

  return serializable;
}

export function toRpcTransactionRequest(
  transaction: TransactionSerializable,
): RpcTransactionRequest {
  const convertToHexValue = (
    value: bigint | number | undefined,
  ): `0x${string}` | undefined => {
    if (value === undefined) {
      return undefined;
    }
    return toHex(value);
  };

  const baseFields = {
    to: transaction.to,
    data: transaction.data,
    value: convertToHexValue(transaction.value),
    gas: convertToHexValue(transaction.gas),
    nonce: convertToHexValue(transaction.nonce),
  };

  switch (transaction.type) {
    case "legacy":
      return {
        ...baseFields,
        type: "0x0",
        gasPrice: convertToHexValue(transaction.gasPrice),
      };
    case "eip2930":
      return {
        ...baseFields,
        type: "0x1",
        gasPrice: convertToHexValue(transaction.gasPrice),
        accessList: transaction.accessList,
      };
    default:
      return {
        ...baseFields,
        type: "0x2",
        maxFeePerGas: convertToHexValue(transaction.maxFeePerGas),
        maxPriorityFeePerGas: convertToHexValue(
          transaction.maxPriorityFeePerGas,
        ),
      };
  }
}
