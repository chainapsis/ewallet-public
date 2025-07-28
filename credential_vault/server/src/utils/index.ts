import { Bytes, type Bytes32, type Bytes33 } from "@keplr-ewallet/bytes";
import { sha256 } from "@keplr-ewallet/sha";

export const TEMP_ENC_SECRET = "temp_enc_secret";

export const TEMP_COMMITTEE_ID = 1;

export type Result<T, E> = SuccessResult<T> | ErrorResult<E>;

export interface SuccessResult<T> {
  success: true;
  data: T;
}

export interface ErrorResult<E> {
  success: false;
  err: E;
}

// @TODO temp
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
