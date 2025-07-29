import type {
  SignableMessage,
  TransactionSerializable,
  TypedDataDefinition,
} from "viem";
import {
  serializeTransaction,
  hashMessage,
  hashTypedData,
  keccak256,
  toBytes,
} from "viem";

export const hashEthereumMessage = (message: SignableMessage): Uint8Array => {
  return toBytes(hashMessage(message));
};

export const hashEthereumTransaction = (
  transaction: TransactionSerializable,
): Uint8Array => {
  return toBytes(keccak256(serializeTransaction(transaction)));
};

export const hashEthereumTypedData = (
  typedData: TypedDataDefinition,
): Uint8Array => {
  return toBytes(hashTypedData(typedData));
};
