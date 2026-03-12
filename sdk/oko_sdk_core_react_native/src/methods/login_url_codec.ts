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

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Uint8Array.from(Buffer.from(normalized + padding, "base64"));
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

function decodeValue<T>(encoded: string): T {
  const compressed = decodeBase64Url(encoded);
  const json = Buffer.from(pako.inflateRaw(compressed)).toString("utf8");
  return JSON.parse(json) as T;
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

export function decodeLoginResultPayload(encoded: string): LoginWalletInfo {
  return decodeValue<LoginWalletInfo>(encoded);
}

export function decodeLoginResultFromCallbackUrl(
  callbackUrl: string,
): LoginWalletInfo {
  const url = new URL(callbackUrl);
  const encoded =
    url.searchParams.get(LOGIN_URL_RESULT_PARAM) ??
    new URLSearchParams(
      url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
    ).get(LOGIN_URL_RESULT_PARAM);

  if (!encoded) {
    throw new Error("Missing login result in callback URL");
  }

  const version =
    url.searchParams.get(LOGIN_URL_VERSION_PARAM) ??
    new URLSearchParams(
      url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
    ).get(LOGIN_URL_VERSION_PARAM);

  if (version && version !== LOGIN_URL_CODEC_VERSION) {
    throw new Error(`Unsupported login result codec version: ${version}`);
  }

  return decodeLoginResultPayload(encoded);
}
