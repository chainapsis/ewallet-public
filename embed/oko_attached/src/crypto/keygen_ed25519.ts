import {
  runTeddsaKeygen,
  type TeddsaKeygenOutputBytes,
} from "@oko-wallet/teddsa-hooks";
import type {
  KeyPackageRaw,
  PublicKeyPackageRaw,
} from "@oko-wallet/oko-types/teddsa";
import type { Result } from "@oko-wallet/stdlib-js";
import { Bytes, type Bytes32 } from "@oko-wallet/bytes";
import type { KeyShareNodeMetaWithNodeStatusInfo } from "@oko-wallet/oko-types/tss";
import type { TeddsaKeyShareByNode } from "@oko-wallet/oko-types/user_key_share";
import {
  extractSigningShare,
  splitTeddsaSigningShare,
} from "./sss_ed25519";

export interface KeyPackageEd25519Hex {
  keyPackage: string;
  publicKeyPackage: string;
  identifier: string;
  publicKey: string;
}

export function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function keyPackageRawToJson(pkg: KeyPackageRaw): string {
  return JSON.stringify(pkg);
}

function publicKeyPackageRawToJson(pkg: PublicKeyPackageRaw): string {
  return JSON.stringify(pkg);
}

function jsonToKeyPackageRaw(json: string): KeyPackageRaw {
  return JSON.parse(json) as KeyPackageRaw;
}

function jsonToPublicKeyPackageRaw(json: string): PublicKeyPackageRaw {
  return JSON.parse(json) as PublicKeyPackageRaw;
}

function stringToHex(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToString(hex: string): string {
  const bytes = hexToUint8Array(hex);
  return new TextDecoder().decode(bytes);
}

export function teddsaKeygenToHex(
  keygen: TeddsaKeygenOutputBytes,
): KeyPackageEd25519Hex {
  return {
    keyPackage: stringToHex(keyPackageRawToJson(keygen.key_package)),
    publicKeyPackage: stringToHex(
      publicKeyPackageRawToJson(keygen.public_key_package),
    ),
    identifier: uint8ArrayToHex(keygen.identifier),
    publicKey: keygen.public_key.toHex(),
  };
}

export function teddsaKeygenFromHex(
  data: KeyPackageEd25519Hex,
): Result<TeddsaKeygenOutputBytes, string> {
  try {
    const publicKeyRes = Bytes.fromHexString(data.publicKey, 32);
    if (!publicKeyRes.success) {
      return { success: false, err: publicKeyRes.err };
    }

    return {
      success: true,
      data: {
        key_package: jsonToKeyPackageRaw(hexToString(data.keyPackage)),
        public_key_package: jsonToPublicKeyPackageRaw(
          hexToString(data.publicKeyPackage),
        ),
        identifier: hexToUint8Array(data.identifier),
        public_key: publicKeyRes.data,
      },
    };
  } catch (error) {
    return {
      success: false,
      err: error instanceof Error ? error.message : String(error),
    };
  }
}

export function getPublicKeyFromKeyPackage(
  keyPackageHex: KeyPackageEd25519Hex,
): Result<Bytes32, string> {
  return Bytes.fromHexString(keyPackageHex.publicKey, 32);
}

/**
 * Build KeyPackageEd25519Hex from separate components for signing operations.
 * Computes client identifier (scalar 1) at runtime.
 *
 * @param keyPackage - hex-encoded KeyPackageRaw JSON (contains signing_share)
 * @param publicKeyPackage - hex-encoded PublicKeyPackageRaw JSON
 * @param publicKey - hex-encoded public key (verifying_key)
 */
export function extractKeyPackageHex(
  keyPackage: string,
  publicKeyPackage: string,
  publicKey: string,
): KeyPackageEd25519Hex {
  // Client identifier is always scalar 1 (little-endian 32-byte)
  const identifierBytes = new Uint8Array(32);
  identifierBytes[0] = 1;
  const identifier = uint8ArrayToHex(identifierBytes);

  return {
    keyPackage,
    publicKeyPackage,
    identifier,
    publicKey,
  };
}

export interface Ed25519KeygenSplitResult {
  keygen1: TeddsaKeygenOutputBytes;
  keygen2: TeddsaKeygenOutputBytes;
  userKeyShares: TeddsaKeyShareByNode[];
}

/**
 * Run ed25519 keygen and split the signing share for distribution to KS nodes.
 * Used by handlers that need to create new ed25519 wallets.
 */
export async function runEd25519KeygenAndSplit(
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
): Promise<
  Result<
    Ed25519KeygenSplitResult,
    { type: "sign_in_request_fail"; error: string }
  >
> {
  // 1. ed25519 keygen
  const ed25519KeygenRes = await runTeddsaKeygen();
  if (ed25519KeygenRes.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: ed25519KeygenRes.err },
    };
  }
  const { keygen_1: keygen1, keygen_2: keygen2 } = ed25519KeygenRes.data;

  // 2. Extract signing share from key package
  const signingShareRes = extractSigningShare(keygen1.key_package);
  if (signingShareRes.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: signingShareRes.err },
    };
  }

  // 3. Split signing share for distribution
  const splitRes = await splitTeddsaSigningShare(
    signingShareRes.data,
    keyshareNodeMeta,
  );
  if (splitRes.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: splitRes.err },
    };
  }

  return {
    success: true,
    data: {
      keygen1,
      keygen2,
      userKeyShares: splitRes.data,
    },
  };
}
