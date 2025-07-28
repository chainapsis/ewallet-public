import { Bytes, type Bytes32 } from "@keplr-ewallet/bytes";

import type { Result } from "@keplr-ewallet-sha/utils";

export async function sha256(
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
