import type { WalletInfo } from "@oko-wallet/oko-sdk-core";
import { Buffer } from "buffer";
import pako from "pako";

export const LOGIN_URL_CODEC_VERSION = "1";
export const LOGIN_URL_RESULT_PARAM = "w";
export const LOGIN_URL_VERSION_PARAM = "v";

export interface LoginUrlEncodingStats {
  jsonBytes: number;
  compressedBytes: number;
  encodedChars: number;
}

export interface LoginWalletInfo extends WalletInfo {
  publicKeyEd25519?: string | null;
}

function encodeBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getUtf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function encodeValue<T>(value: T): string {
  return encodeValueWithStats(value).encoded;
}

function encodeValueWithStats<T>(value: T): {
  encoded: string;
  stats: LoginUrlEncodingStats;
} {
  const json = JSON.stringify(value);
  const compressed = pako.deflateRaw(json);
  const encoded = encodeBase64Url(compressed);

  return {
    encoded,
    stats: {
      jsonBytes: getUtf8ByteLength(json),
      compressedBytes: compressed.length,
      encodedChars: encoded.length,
    },
  };
}

export function encodeLoginResultPayload(payload: LoginWalletInfo): string {
  return encodeValue(payload);
}

export function encodeLoginResultPayloadWithStats(payload: LoginWalletInfo): {
  encoded: string;
  stats: LoginUrlEncodingStats;
} {
  return encodeValueWithStats(payload);
}
