import type { RpcTransactionRequest, TransactionSerializable } from "viem";
import { toHex } from "viem";

export const toTransactionSerializable = ({
  chainId,
  tx,
}: {
  chainId: string;
  tx: RpcTransactionRequest;
}): TransactionSerializable => {
  const convertValue = <T>(
    value: string | number | undefined,
    converter: (value: string | number) => T,
    defaultValue?: T,
  ): T | undefined => (value !== undefined ? converter(value) : defaultValue);

  const { from, ...transaction } = tx;
  const txType = transaction.type || "0x2"; // Default to EIP-1559

  let chainIdNumber: number;
  if (chainId.startsWith("0x")) {
    chainIdNumber = parseInt(chainId, 16);
  } else {
    chainIdNumber = parseInt(chainId);
  }

  const baseFields = {
    chainId: chainIdNumber,
    to: transaction.to || null,
    data: transaction.data,
    gas: convertValue(transaction.gas, BigInt),
    nonce: convertValue(transaction.nonce, (value) =>
      parseInt(value.toString(), 16),
    ),
    value: convertValue(transaction.value, BigInt) || BigInt(0),
  };

  const typeMapping: { [key: string]: "legacy" | "eip2930" | "eip1559" } = {
    "0x0": "legacy",
    "0x1": "eip2930",
    "0x2": "eip1559",
  };

  const mappedType = typeMapping[txType] || "eip1559";

  let transactionSerializable: TransactionSerializable;

  switch (mappedType) {
    case "legacy":
      transactionSerializable = {
        ...baseFields,
        type: "legacy",
        gasPrice: convertValue(transaction.gasPrice, BigInt),
      };
      break;
    case "eip2930":
      transactionSerializable = {
        ...baseFields,
        type: "eip2930",
        gasPrice: convertValue(transaction.gasPrice, BigInt),
        accessList: transaction.accessList || [],
      };
      break;
    case "eip1559":
    default:
      transactionSerializable = {
        ...baseFields,
        type: "eip1559",
        maxPriorityFeePerGas: convertValue(
          transaction.maxPriorityFeePerGas,
          BigInt,
        ),
        maxFeePerGas: convertValue(transaction.maxFeePerGas, BigInt),
      };
      break;
  }

  return transactionSerializable;
};

export const toRpcTransactionRequest = (
  transaction: TransactionSerializable,
): RpcTransactionRequest => {
  const convertToHex = (
    value: bigint | number | undefined,
  ): `0x${string}` | undefined => {
    if (value === undefined) return undefined;
    return toHex(value);
  };

  const base = {
    to: transaction.to,
    data: transaction.data,
    value: convertToHex(transaction.value),
    gas: convertToHex(transaction.gas),
    nonce: convertToHex(transaction.nonce),
  };

  switch (transaction.type) {
    case "legacy":
      return {
        ...base,
        type: "0x0",
        gasPrice: convertToHex(transaction.gasPrice),
      };
    case "eip2930":
      return {
        ...base,
        type: "0x1",
        gasPrice: convertToHex(transaction.gasPrice),
        accessList: transaction.accessList,
      };
    case "eip1559":
    default:
      return {
        ...base,
        type: "0x2",
        maxFeePerGas: convertToHex(transaction.maxFeePerGas),
        maxPriorityFeePerGas: convertToHex(transaction.maxPriorityFeePerGas),
      };
  }
};
