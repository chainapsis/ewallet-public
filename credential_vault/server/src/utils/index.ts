import { Bytes, type Bytes32, type Bytes33 } from "@keplr-ewallet/bytes";
import type { Result } from "@keplr-ewallet/stdlib-js";

export const TEMP_ENC_SECRET = "temp_enc_secret";

export const TEMP_COMMITTEE_ID = 1;

export async function hashIdTokenWithUserSessionPublicKey(
  idToken: string,
  userSessionPublicKey: Bytes33,
): Promise<Result<Bytes32, string>> {
  const hashResult = await sha256(idToken + userSessionPublicKey.toHex());
  if (hashResult.success === false) {
    return {
      success: false,
      err: hashResult.err,
    };
  }
  const result = Bytes.fromUint8Array<32>(
    hashResult.data.toUint8Array(),
    hashResult.data.length,
  );
  if (!result.success) {
    return {
      success: false,
      err: result.err,
    };
  }
  return {
    success: true,
    data: result.data,
  };
}

async function sha256(
  data: string | ArrayBuffer,
): Promise<Result<Bytes32, string>> {
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === "string" ? encoder.encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", dataBuffer);
  const result = Bytes.fromUint8Array<32>(new Uint8Array(hash), 32);
  if (!result.success) {
    return {
      success: false,
      err: result.err,
    };
  }
  return {
    success: true,
    data: result.data,
  };
}
