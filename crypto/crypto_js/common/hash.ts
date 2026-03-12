import { sha256 as nobleSHA256 } from "@noble/hashes/sha2.js";
import { Bytes, type Bytes32 } from "@oko-wallet/bytes";
import type { Result } from "@oko-wallet/stdlib-js";

export function sha256(data: string | Uint8Array): Result<Bytes32, string> {
  try {
    const encoder = new TextEncoder();
    const dataBuffer =
      typeof data === "string" ? encoder.encode(data) : new Uint8Array(data);
    const bytesResult = Bytes.fromUint8Array(nobleSHA256(dataBuffer), 32);
    if (!bytesResult.success) {
      return {
        success: false,
        err: `Failed to convert data to bytes: ${bytesResult.err}`,
      };
    }
    return {
      success: true,
      data: bytesResult.data,
    };
  } catch (error) {
    return {
      success: false,
      err: `Failed to hash data: ${String(error)}`,
    };
  }
}
