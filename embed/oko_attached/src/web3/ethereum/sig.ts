import type { MakeSigError } from "@oko-wallet/oko-sdk-core";
import {
  encodeEthereumSignature,
  hashEthereumMessage,
  hashEthereumTransaction,
  hashEthereumTypedData,
  parseTypedDataDefinition,
} from "@oko-wallet/oko-sdk-eth";
import type { Result } from "@oko-wallet/stdlib-js";
import {
  type Hex,
  type SignableMessage,
  serializeSignature,
  serializeTransaction,
  type TransactionSerializable,
} from "viem";

import { makeSignature } from "@oko-wallet-attached/web3/sig";

export async function makeEthereumTxSignature(
  hostOrigin: string,
  txSerializable: TransactionSerializable,
  getIsAborted: () => boolean,
): Promise<Result<Hex, MakeSigError>> {
  const msgHash = hashEthereumTransaction(txSerializable);

  const signOutputRes = await makeSignature(hostOrigin, msgHash, getIsAborted);
  if (!signOutputRes.success) {
    return { success: false, err: signOutputRes.err };
  }

  const signOutput = signOutputRes.data;

  const signature = encodeEthereumSignature(signOutput);

  const signedTransaction = serializeTransaction(txSerializable, signature);

  return { success: true, data: signedTransaction };
}

export async function makeEthereumArbitraryMessageSignature(
  hostOrigin: string,
  message: SignableMessage,
  getIsAborted: () => boolean,
): Promise<Result<Hex, MakeSigError>> {
  const msgHash = hashEthereumMessage(message);

  const signOutputRes = await makeSignature(hostOrigin, msgHash, getIsAborted);
  if (!signOutputRes.success) {
    return { success: false, err: signOutputRes.err };
  }

  const signOutput = signOutputRes.data;

  const signature = encodeEthereumSignature(signOutput);

  return { success: true, data: serializeSignature(signature) };
}

export async function makeEthereumEip712Signature(
  hostOrigin: string,
  serializedTypedData: string,
  getIsAborted: () => boolean,
): Promise<Result<Hex, MakeSigError>> {
  const typedData = parseTypedDataDefinition(serializedTypedData);

  const msgHash = hashEthereumTypedData(typedData);

  const signOutputRes = await makeSignature(hostOrigin, msgHash, getIsAborted);
  if (!signOutputRes.success) {
    return { success: false, err: signOutputRes.err };
  }

  const signOutput = signOutputRes.data;

  const signature = encodeEthereumSignature(signOutput);

  return { success: true, data: serializeSignature(signature) };
}
