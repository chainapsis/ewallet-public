import type { Bytes } from "@oko-wallet/bytes";
import { buildRevealMessage, sha256 } from "@oko-wallet/crypto-js";
import type { EddsaKeypair } from "@oko-wallet/crypto-js/node/ecdhe";
import {
  convertEddsaSignatureToBytes,
  generateEddsaKeypair,
  signMessage,
} from "@oko-wallet/crypto-js/node/ecdhe";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { v4 as uuidv4 } from "uuid";

export type { EddsaKeypair };

export function generateSessionId(): string {
  return uuidv4();
}

export function generateClientKeypair(): EddsaKeypair {
  const result = generateEddsaKeypair();
  if (!result.success) {
    throw new Error(`Failed to generate keypair: ${result.err}`);
  }
  return result.data;
}

export function computeIdTokenHash(
  authType: AuthType,
  idToken: string,
): string {
  const hashRes = sha256(`${authType}${idToken}`);
  if (!hashRes.success) {
    throw new Error(`Failed to compute id_token hash: ${hashRes.err}`);
  }
  return hashRes.data.toHex();
}

export function createRevealSignature(
  clientPrivateKey: Bytes<32>,
  nodePubkey: string,
  sessionId: string,
  authType: AuthType,
  idToken: string,
  operationType: string,
  apiName: string,
): string {
  const message = buildRevealMessage({
    nodePubkeyHex: nodePubkey,
    sessionId,
    authType,
    idToken,
    operationType,
    apiName,
  });

  const signRes = signMessage(message, clientPrivateKey);
  if (!signRes.success) {
    throw new Error(`Failed to sign message: ${signRes.err}`);
  }

  const sigBytesRes = convertEddsaSignatureToBytes(signRes.data);
  if (!sigBytesRes.success) {
    throw new Error(`Failed to convert signature: ${sigBytesRes.err}`);
  }

  return sigBytesRes.data.toHex();
}
