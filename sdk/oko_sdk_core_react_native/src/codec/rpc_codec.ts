import { Buffer } from "buffer";
import pako from "pako";

/**
 * Generic RPC codec for app ↔ attached_mobile_host_web communication.
 *
 * Handles types that can't be directly serialized to JSON:
 * - bigint  → { __oko_t: "bigint", value: "123" }
 * - Uint8Array → { __oko_t: "u8", value: "<base64url>" }
 *
 * Encoding pipeline: value → tag special types → JSON → pako deflate → base64url
 */

export const RPC_CODEC_VERSION = "1";
export const RPC_PAYLOAD_PARAM = "p";
export const RPC_RESULT_PARAM = "r";
export const RPC_VERSION_PARAM = "v";

// ─── Tagged value types ───

type EncodedValue =
  | null
  | boolean
  | number
  | string
  | EncodedValue[]
  | { [key: string]: EncodedValue };

type TaggedValue =
  | { __oko_t: "bigint"; value: string }
  | { __oko_t: "u8"; value: string };

// ─── Base64url ───

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

// ─── Tag / untag ───

function toEncodedValue(value: unknown): EncodedValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "bigint") {
    const tagged: TaggedValue = { __oko_t: "bigint", value: value.toString() };
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

// ─── Public API ───

export interface RpcEncodingStats {
  jsonBytes: number;
  compressedBytes: number;
  encodedChars: number;
}

export function encodeRpcPayload<T>(value: T): string {
  return encodeRpcPayloadWithStats(value).encoded;
}

export function encodeRpcPayloadWithStats<T>(value: T): {
  encoded: string;
  stats: RpcEncodingStats;
} {
  const normalized = toEncodedValue(value);
  const json = JSON.stringify(normalized);
  const compressed = pako.deflateRaw(json);
  const encoded = encodeBase64Url(compressed);
  return {
    encoded,
    stats: {
      jsonBytes: Buffer.byteLength(json, "utf8"),
      compressedBytes: compressed.length,
      encodedChars: encoded.length,
    },
  };
}

export function decodeRpcPayload<T>(encoded: string): T {
  const compressed = decodeBase64Url(encoded);
  const json = Buffer.from(pako.inflateRaw(compressed)).toString("utf8");
  const parsed = JSON.parse(json) as EncodedValue;
  return fromEncodedValue(parsed) as T;
}

// ─── URL helpers (mobile SDK side) ───

export function buildRpcUrl(
  sdkEndpoint: string,
  method: string,
  payload: unknown,
  apiKey: string,
  redirectScheme: string,
  expectedPublicKey?: string | null,
  clientRandom?: string | null,
): { url: string; stats: RpcEncodingStats } {
  const url = new URL("/mobile/rpc", sdkEndpoint);
  url.searchParams.set("method", method);
  url.searchParams.set("host_origin", sdkEndpoint);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("redirect_scheme", redirectScheme);
  if (expectedPublicKey) {
    url.searchParams.set("expected_pk", expectedPublicKey);
  }
  const { encoded, stats } = encodeRpcPayloadWithStats(payload);
  const hashParams = new URLSearchParams();
  hashParams.set(RPC_VERSION_PARAM, RPC_CODEC_VERSION);
  hashParams.set(RPC_PAYLOAD_PARAM, encoded);
  if (clientRandom) {
    hashParams.set("client_random", clientRandom);
  }
  url.hash = hashParams.toString();

  return { url: url.toString(), stats };
}

export function parseRpcResultFromCallbackUrl<T>(callbackUrl: string): T {
  const url = new URL(callbackUrl);
  const encoded =
    url.searchParams.get(RPC_RESULT_PARAM) ??
    new URLSearchParams(
      url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
    ).get(RPC_RESULT_PARAM);

  if (!encoded) {
    throw new Error("Missing RPC result in callback URL");
  }

  return decodeRpcPayload<T>(encoded);
}
