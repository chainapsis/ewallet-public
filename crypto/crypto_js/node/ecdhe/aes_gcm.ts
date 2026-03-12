import { Bytes, type BytesN } from "@oko-wallet/bytes";
import type { Result } from "@oko-wallet/stdlib-js";

import type { EcdheSessionKey } from "../../common/ecdhe";

const AES_GCM_IV_LENGTH = 12;
const AES_GCM_TAG_LENGTH = 128; // bits

export async function encryptWithEcdheKey(
  data: Uint8Array,
  sessionKey: EcdheSessionKey,
): Promise<Result<BytesN, string>> {
  const crypto = globalThis.crypto;

  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    sessionKey.key.toArrayBuffer(),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  try {
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: AES_GCM_TAG_LENGTH,
      },
      cryptoKey,
      new Uint8Array(data),
    );

    // iv(12) + ciphertext + authTag(16)
    const result = new Uint8Array(iv.length + ciphertext.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(ciphertext), iv.length);

    const resultBytes = Bytes.fromUint8Array(result, result.length);
    if (!resultBytes.success) {
      return { success: false, err: resultBytes.err };
    }

    return { success: true, data: resultBytes.data };
  } catch (e) {
    return {
      success: false,
      err: e instanceof Error ? e.message : "Encryption failed",
    };
  }
}

export async function decryptWithEcdheKey(
  encryptedData: BytesN,
  sessionKey: EcdheSessionKey,
): Promise<Result<BytesN, string>> {
  const crypto = globalThis.crypto;

  if (encryptedData.length < AES_GCM_IV_LENGTH + 16) {
    return { success: false, err: "Encrypted data is too short" };
  }

  const u8Array = encryptedData.toUint8Array();

  const iv = u8Array.slice(0, AES_GCM_IV_LENGTH);
  const ciphertext = u8Array.slice(AES_GCM_IV_LENGTH);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    sessionKey.key.toArrayBuffer(),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: AES_GCM_TAG_LENGTH,
      },
      cryptoKey,
      ciphertext,
    );

    const u8Array = new Uint8Array(plaintext);

    const resultBytes = Bytes.fromUint8Array(u8Array, u8Array.length);
    if (!resultBytes.success) {
      return { success: false, err: resultBytes.err };
    }

    return { success: true, data: resultBytes.data };
  } catch (e) {
    return {
      success: false,
      err: e instanceof Error ? e.message : "Decryption failed",
    };
  }
}
