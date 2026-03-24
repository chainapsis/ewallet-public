import { Buffer } from "buffer";
import pako from "pako";

/**
 * Generic RPC codec for app ↔ attached_mobile_host_web communication.
 * Mirror of the mobile SDK RPC codec (e.g. oko_sdk_core_react_native/src/codec/rpc_codec.ts)
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

// ─── URL helpers (mobile host web side) ───

/**
 * Parse RPC method and encoded payload from the current page URL.
 */
export function parseRpcRequestFromLocation(): {
  method: string;
  encodedPayload: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  const method = params.get("method") ?? "";

  const hashParams = new URLSearchParams(
    window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash,
  );
  const encodedPayload =
    hashParams.get(RPC_PAYLOAD_PARAM) ?? params.get(RPC_PAYLOAD_PARAM);

  return { method, encodedPayload };
}

/**
 * Build a callback URL with the encoded result for scheme redirect.
 */
export function buildRpcCallbackUrl(
  redirectScheme: string,
  result: unknown,
): { url: string; stats: RpcEncodingStats } {
  const query = new URLSearchParams();
  query.set(RPC_VERSION_PARAM, RPC_CODEC_VERSION);
  const { encoded, stats } = encodeRpcPayloadWithStats(result);
  query.set(RPC_RESULT_PARAM, encoded);
  return { url: `${redirectScheme}://?${query.toString()}`, stats };
}
