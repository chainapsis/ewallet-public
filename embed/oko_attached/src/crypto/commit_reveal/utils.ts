import { v4 as uuidv4 } from "uuid";
import { sha256, buildRevealMessage } from "@oko-wallet/crypto-js";
import {
  generateEddsaKeypair,
  signMessage,
  convertEddsaSignatureToBytes,
} from "@oko-wallet/crypto-js/browser";
import type { Bytes } from "@oko-wallet/bytes";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { Result } from "@oko-wallet/stdlib-js";

export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export function generateSessionId(): string {
  return uuidv4();
}

export function generateClientKeypair() {
  return generateEddsaKeypair();
}

export function computeIdTokenHash(
  authType: AuthType,
  idToken: string,
): Result<string, string> {
  const hashRes = sha256(`${authType}${idToken}`);
  if (!hashRes.success) {
    return { success: false, err: hashRes.err };
  }
  return { success: true, data: hashRes.data.toHex() };
}

export function createRevealSignature(
  clientPrivateKey: Bytes<32>,
  nodePubkey: string,
  sessionId: string,
  authType: AuthType,
  idToken: string,
  operationType: string,
  apiName: string,
): Result<string, string> {
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
    return { success: false, err: signRes.err };
  }
  const sigBytesRes = convertEddsaSignatureToBytes(signRes.data);
  if (!sigBytesRes.success) {
    return { success: false, err: sigBytesRes.err };
  }
  return { success: true, data: sigBytesRes.data.toHex() };
}
