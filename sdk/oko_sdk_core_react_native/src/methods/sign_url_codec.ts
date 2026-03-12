import type {
  OpenModalAckPayload,
  OpenModalPayload,
} from "@oko-wallet/oko-sdk-core";
import { Buffer } from "buffer";
import pako from "pako";

export const SIGN_URL_CODEC_VERSION = "1";
export const SIGN_URL_REQUEST_PARAM = "p";
export const SIGN_URL_RESULT_PARAM = "r";
export const SIGN_URL_VERSION_PARAM = "v";

export interface SignUrlEncodingStats {
  jsonBytes: number;
  compressedBytes: number;
  encodedChars: number;
}

type EncodedValue =
  | null
  | boolean
  | number
  | string
  | EncodedValue[]
  | { [key: string]: EncodedValue };

type TaggedValue =
  | {
      __oko_t: "bigint";
      value: string;
    }
  | {
      __oko_t: "u8";
      value: string;
    };

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

function toEncodedValue(value: unknown): EncodedValue {
  if (value === null) {
    return null;
  }

  if (typeof value === "bigint") {
    const tagged: TaggedValue = {
      __oko_t: "bigint",
      value: value.toString(),
    };
    return tagged as EncodedValue;
  }

  if (value instanceof Uint8Array) {
    const tagged: TaggedValue = {
      __oko_t: "u8",
      value: encodeBase64Url(value),
    };
    return tagged as EncodedValue;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toEncodedValue(item));
  }

  switch (typeof value) {
    case "boolean":
    case "number":
    case "string":
      return value;
    case "undefined":
      return null;
    case "object": {
      const out: Record<string, EncodedValue> = {};
      for (const [key, nested] of Object.entries(value)) {
        if (nested === undefined) {
          continue;
        }
        out[key] = toEncodedValue(nested);
      }
      return out;
    }
    default:
      throw new Error(`Unsupported payload value type: ${typeof value}`);
  }
}

function fromEncodedValue(value: EncodedValue): unknown {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => fromEncodedValue(item));
  }

  if (typeof value !== "object") {
    return value;
  }

  if ("__oko_t" in value) {
    const tagged = value as unknown as TaggedValue;
    if (tagged.__oko_t === "bigint") {
      return BigInt(tagged.value);
    }
    if (tagged.__oko_t === "u8") {
      return decodeBase64Url(tagged.value);
    }
  }

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    out[key] = fromEncodedValue(nested);
  }
  return out;
}

function encodeValue<T>(value: T): string {
  return encodeValueWithStats(value).encoded;
}

function encodeValueWithStats<T>(value: T): {
  encoded: string;
  stats: SignUrlEncodingStats;
} {
  const normalized = toEncodedValue(value);
  const json = JSON.stringify(normalized);
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
  const parsed = JSON.parse(json) as EncodedValue;
  return fromEncodedValue(parsed) as T;
}

export function encodeSignRequestPayload(payload: OpenModalPayload): string {
  return encodeValue(payload);
}

export function encodeSignRequestPayloadWithStats(payload: OpenModalPayload): {
  encoded: string;
  stats: SignUrlEncodingStats;
} {
  return encodeValueWithStats(payload);
}

export function decodeSignResultPayload(encoded: string): OpenModalAckPayload {
  return decodeValue<OpenModalAckPayload>(encoded);
}

export function encodeSignResultPayloadWithStats(
  payload: OpenModalAckPayload,
): { encoded: string; stats: SignUrlEncodingStats } {
  return encodeValueWithStats(payload);
}

export function decodeSignResultFromCallbackUrl(
  callbackUrl: string,
): OpenModalAckPayload {
  const url = new URL(callbackUrl);
  const encoded =
    url.searchParams.get(SIGN_URL_RESULT_PARAM) ??
    new URLSearchParams(
      url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
    ).get(SIGN_URL_RESULT_PARAM);

  if (!encoded) {
    throw new Error("Missing signing result in callback URL");
  }

  const version =
    url.searchParams.get(SIGN_URL_VERSION_PARAM) ??
    new URLSearchParams(
      url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
    ).get(SIGN_URL_VERSION_PARAM);

  if (version && version !== SIGN_URL_CODEC_VERSION) {
    throw new Error(`Unsupported signing result codec version: ${version}`);
  }

  return decodeSignResultPayload(encoded);
}
