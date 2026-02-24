import {
  runTeddsaKeygenSeed,
  type TeddsaKeygenOutputBytes,
} from "@oko-wallet/teddsa-hooks";
import type {
  KeyPackageRaw,
  PublicKeyPackageRaw,
} from "@oko-wallet/oko-types/teddsa";
import type { Result } from "@oko-wallet/stdlib-js";
import { Bytes, type Bytes32 } from "@oko-wallet/bytes";
import type { KeyShareNodeMetaWithNodeStatusInfo } from "@oko-wallet/oko-types/tss";
import type {
  PointNumArr,
  TeddsaKeyShareByNode,
} from "@oko-wallet/oko-types/user_key_share";
import * as secp256k1Wasm from "@oko-wallet/cait-sith-keplr-wasm/pkg/cait_sith_keplr_wasm";
import { extractSigningShare, splitTeddsaSigningShare } from "./sss_ed25519";
import { hashKeyshareNodeNames } from "./hash";

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

/**
 * Serialize a SeedSharePoint to hex string (x[32] || y[32] = 128 hex chars).
 */
export function seedShareToHex(share: SeedSharePoint): string {
  return share.x.toHex() + share.y.toHex();
}

/**
 * Deserialize a hex string (128 chars) back to SeedSharePoint.
 */
export function hexToSeedSharePoint(
  hex: string,
): Result<SeedSharePoint, string> {
  if (hex.length !== 128) {
    return {
      success: false,
      err: `expected 128 hex chars, got ${hex.length}`,
    };
  }
  const xRes = Bytes.fromHexString(hex.slice(0, 64), 32);
  if (!xRes.success) {
    return { success: false, err: xRes.err };
  }
  const yRes = Bytes.fromHexString(hex.slice(64), 32);
  if (!yRes.success) {
    return { success: false, err: yRes.err };
  }
  return { success: true, data: { x: xRes.data, y: yRes.data } };
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

export interface SeedSharePoint {
  x: Bytes32;
  y: Bytes32;
}

export interface SeedShareByNode {
  node: { name: string; endpoint: string };
  share: SeedSharePoint;
}

export interface Ed25519KeygenSplitResult {
  keygen1: TeddsaKeygenOutputBytes;
  keygen2: TeddsaKeygenOutputBytes;
  userKeyShares: TeddsaKeyShareByNode[];
  serverSeedShare: SeedSharePoint;
  ksnSeedShares: SeedShareByNode[];
  userSeedEd25519: number[];
}

/**
 * Generate a random 32-byte seed.
 * All 32-byte values are valid because seed SSS uses a 257-bit prime (p = 2^256 + 297 > 2^256).
 */
function generateSeed(): Result<Bytes32, string> {
  const seedBytes = new Uint8Array(32);
  crypto.getRandomValues(seedBytes);
  return Bytes.fromUint8Array(seedBytes, 32);
}

/**
 * Convert a PointNumArr (from secp256k1 WASM) to a SeedSharePoint (Bytes32 pair).
 */
function pointNumArrToSeedShare(
  point: PointNumArr,
): Result<SeedSharePoint, string> {
  const xRes = Bytes.fromUint8Array(Uint8Array.from([...point.x]), 32);
  if (!xRes.success) {
    return { success: false, err: xRes.err };
  }
  const yRes = Bytes.fromUint8Array(Uint8Array.from([...point.y]), 32);
  if (!yRes.success) {
    return { success: false, err: yRes.err };
  }
  return { success: true, data: { x: xRes.data, y: yRes.data } };
}

/**
 * Seed SSS 2-of-2 split identifiers (big-endian 32-byte scalars).
 * Matches Cait-Sith convention: client = 1, server = 2.
 */
function seedSplitId(scalar: number): number[] {
  const id = new Array<number>(32).fill(0);
  id[31] = scalar;
  return id;
}
export const SEED_ID_CLIENT = seedSplitId(1);
export const SEED_ID_SERVER = seedSplitId(2);

/**
 * Run ed25519 keygen from seed and split both signing share and seed for distribution.
 *
 * 1. Generate seed (32B)
 * 2. Derive Ed25519 scalar from seed (SHA-512 + clamp + mod l) via WASM
 * 3. FROST split scalar into signing shares (existing flow)
 * 4. 257-bit prime SSS split seed into 2-of-2 (server + user)
 * 5. 257-bit prime SSS split user's seed share Y into t-of-n for KSN distribution
 */
export async function runEd25519KeygenAndSplit(
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
): Promise<
  Result<
    Ed25519KeygenSplitResult,
    { type: "sign_in_request_fail"; error: string }
  >
> {
  // 1. Generate seed
  const seedRes = generateSeed();
  if (!seedRes.success) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: seedRes.err },
    };
  }
  const seed = seedRes.data;

  // 2. Seed-based ed25519 keygen (SHA-512 + clamp + mod l → scalar → FROST split)
  const ed25519KeygenRes = await runTeddsaKeygenSeed(seed);
  if (ed25519KeygenRes.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: ed25519KeygenRes.err },
    };
  }
  const { keygen_1: keygen1, keygen_2: keygen2 } = ed25519KeygenRes.data;

  // 3. Extract and split signing share for KSN distribution (existing Ed25519 SSS)
  const signingShareRes = extractSigningShare(keygen1.key_package);
  if (signingShareRes.success === false) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: signingShareRes.err },
    };
  }
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

  // 4. Seed 2-of-2 split via 257-bit prime SSS (server + user)
  const seedSplitPoints: PointNumArr[] = secp256k1Wasm.seed_sss_split(
    [...seed.toUint8Array()],
    [SEED_ID_SERVER, SEED_ID_CLIENT],
    2,
  );

  const serverSeedShareRes = pointNumArrToSeedShare(seedSplitPoints[0]);
  if (!serverSeedShareRes.success) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: serverSeedShareRes.err },
    };
  }
  const userSeedY = seedSplitPoints[1].y;

  // 5. User seed share Y → t-of-n split for KSN distribution via 257-bit prime SSS
  const ksnHashesRes = await hashKeyshareNodeNames(
    keyshareNodeMeta.nodes.map((n) => n.name),
  );
  if (!ksnHashesRes.success) {
    return {
      success: false,
      err: { type: "sign_in_request_fail", error: ksnHashesRes.err },
    };
  }
  const ksnHashes = ksnHashesRes.data.map((b) => [...b.toUint8Array()]);

  const ksnSeedSplitPoints: PointNumArr[] = secp256k1Wasm.seed_sss_split(
    userSeedY,
    ksnHashes,
    keyshareNodeMeta.threshold,
  );

  const ksnSeedShares: SeedShareByNode[] = [];
  for (let i = 0; i < ksnSeedSplitPoints.length; i++) {
    const shareRes = pointNumArrToSeedShare(ksnSeedSplitPoints[i]);
    if (!shareRes.success) {
      return {
        success: false,
        err: { type: "sign_in_request_fail", error: shareRes.err },
      };
    }
    ksnSeedShares.push({
      node: {
        name: keyshareNodeMeta.nodes[i].name,
        endpoint: keyshareNodeMeta.nodes[i].endpoint,
      },
      share: shareRes.data,
    });
  }

  return {
    success: true,
    data: {
      keygen1,
      keygen2,
      userKeyShares: splitRes.data,
      serverSeedShare: serverSeedShareRes.data,
      ksnSeedShares,
      userSeedEd25519: [...userSeedY],
    },
  };
}
