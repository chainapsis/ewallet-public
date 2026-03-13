import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import type { Bytes32 } from "@oko-wallet/bytes";
import type { Result } from "@oko-wallet/stdlib-js";

import { sha256 } from "../hash";

export interface EcdheSessionKey {
  prefix: string;
  key: Bytes32;
}

export function deriveSessionKey(
  privateKey: Bytes32,
  counterPartyPublicKey: Bytes32,
  prefix: string = "oko",
): Result<EcdheSessionKey, string> {
  try {
    const publicX = ed25519.utils.toMontgomery(
      counterPartyPublicKey.toUint8Array(),
    );
    const privateX = ed25519.utils.toMontgomerySecret(
      privateKey.toUint8Array(),
    );

    const sharedKey = x25519.getSharedSecret(privateX, publicX);

    const prefixBytes = new TextEncoder().encode(prefix + "_");
    const combinedU8Arr = new Uint8Array([...prefixBytes, ...sharedKey]);

    const keyBytesResult = sha256(combinedU8Arr);
    if (!keyBytesResult.success) {
      return {
        success: false,
        err: `Failed to hash combined bytes: ${keyBytesResult.err}`,
      };
    }

    return {
      success: true,
      data: {
        prefix,
        key: keyBytesResult.data,
      },
    };
  } catch (error) {
    return {
      success: false,
      err: `Failed to derive key: ${String(error)}`,
    };
  }
}
