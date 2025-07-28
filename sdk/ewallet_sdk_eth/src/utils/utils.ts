import type {
  SignableMessage,
  TransactionSerializable,
  TypedDataDefinition,
  Signature,
  Hex,
  Address,
  ByteArray,
} from "viem";
import {
  serializeTransaction,
  hashMessage,
  hashTypedData,
  keccak256,
  toBytes,
  pad,
  toHex,
} from "viem";
import { publicKeyToAddress } from "viem/accounts";
import type { SignOutput } from "@keplr-ewallet/ewallet-sdk-core";
import { secp256k1 } from "@noble/curves/secp256k1";

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

export const publicKeyToEthereumAddress = (
  publicKey: Hex | ByteArray,
  uncompressed?: boolean,
): Address => {
  let publicKeyWithout0x: string | ByteArray = publicKey;
  if (typeof publicKey === "string" && publicKey.startsWith("0x")) {
    publicKeyWithout0x = publicKey.slice(2);
  }

  const point = secp256k1.Point.fromHex(publicKeyWithout0x);

  if (uncompressed) {
    return publicKeyToAddress(`0x${point.toHex()}`);
  }

  return publicKeyToAddress(`0x${point.toHex(true)}`);
};
