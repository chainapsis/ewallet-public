import type {
  SignableMessage,
  TransactionSerializable,
  TypedDataDefinition,
} from "viem";
import {
  hashMessage,
  hashTypedData,
  keccak256,
  serializeTransaction,
  toBytes,
} from "viem";

export function hashEthereumMessage(message: SignableMessage): Uint8Array {
  return toBytes(hashMessage(message));
}

export function hashEthereumTransaction(
  transaction: TransactionSerializable,
): Uint8Array {
  return toBytes(keccak256(serializeTransaction(transaction)));
}

export function hashEthereumTypedData(
  typedData: TypedDataDefinition,
): Uint8Array {
  return toBytes(hashTypedData(typedData));
}
