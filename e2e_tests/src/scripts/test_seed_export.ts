/**
 * Temporary script to verify the seed export flow end-to-end.
 *
 * Tests:
 *   1. Generate random 32-byte seed
 *   2. Derive ed25519 public key from seed (standard derivation)
 *   3. Split seed into 2-of-2 (server + user) via 257-bit prime SSS
 *   4. Split user's seed share Y into 2-of-3 for KSN nodes
 *   5. Combine 2 of 3 KSN shares → recover user Y
 *   6. Combine server + user shares → recover original seed
 *   7. Verify recovered seed matches & derive same ed25519 public key
 *   8. Output in Phantom/SVM standard format: bs58(seed[32] || pubkey[32])
 *
 * Run from the workspace root:
 *   npx tsx e2e_tests/src/scripts/test_seed_export.ts
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve workspace root (e2e_tests/src/scripts -> repo root)
const WORKSPACE_ROOT = resolve(__dirname, "../../..");

// --- Load WASM ---
const wasmJsPath = resolve(
  WORKSPACE_ROOT,
  "crypto/tecdsa/cait_sith_keplr_wasm/pkg/cait_sith_keplr_wasm.js",
);
const wasmBinPath = resolve(
  WORKSPACE_ROOT,
  "crypto/tecdsa/cait_sith_keplr_wasm/pkg/cait_sith_keplr_wasm_bg.wasm",
);

const wasm = await import(wasmJsPath);
const wasmBytes = readFileSync(wasmBinPath);
wasm.initSync({ module: wasmBytes });

// --- Load ed25519 & bs58 ---
const { ed25519 } = await import("@noble/curves/ed25519");
const bs58Module = await import("bs58");
const bs58 = bs58Module.default;

// --- Utilities ---
type Point = { x: number[]; y: number[] };

/**
 * SHA-256 hash with first byte zeroed, matching hashKeyshareNodeNames
 * from embed/oko_attached/src/crypto/hash.ts
 * (used for KSN node identifiers)
 */
function hashName(name: string): number[] {
  const hash = createHash("sha256").update(name).digest();
  hash[0] = 0;
  return [...hash];
}

/**
 * Seed SSS 2-of-2 identifier (big-endian 32-byte scalar).
 * Matches Cait-Sith convention: client = 1, server = 2.
 */
function seedSplitId(scalar: number): number[] {
  const id = new Array<number>(32).fill(0);
  id[31] = scalar;
  return id;
}
const SEED_ID_CLIENT = seedSplitId(1);
const SEED_ID_SERVER = seedSplitId(2);

function toHex(arr: number[] | Uint8Array | Buffer): string {
  return Buffer.from(arr).toString("hex");
}

// --- Main Flow ---
console.log("=== Seed Export Flow Test ===\n");

// 1. Generate random 32-byte seed
const seed = randomBytes(32);
console.log("1. Generated seed:", toHex(seed));

// 2. Derive ed25519 public key from seed (standard ed25519 derivation)
const publicKey = ed25519.getPublicKey(seed);
console.log("2. Ed25519 public key:", toHex(publicKey));

// 3. Seed 2-of-2 split (server=2, client/user=1) — matching Cait-Sith convention
const seedSplitPoints: Point[] = wasm.seed_sss_split(
  [...seed],
  [SEED_ID_SERVER, SEED_ID_CLIENT],
  2,
);

console.log("\n3. Seed 2-of-2 split (server + user):");
console.log("   Server share (x):", toHex(seedSplitPoints[0].x));
console.log("   Server share (y):", toHex(seedSplitPoints[0].y));
console.log("   User share   (x):", toHex(seedSplitPoints[1].x));
console.log("   User share   (y):", toHex(seedSplitPoints[1].y));

// 4. User's seed Y → 2-of-3 KSN split (simulating KSN node distribution)
const ksnNames = ["ksn_node_1", "ksn_node_2", "ksn_node_3"];
const ksnHashes = ksnNames.map(hashName);

const ksnSplitPoints: Point[] = wasm.seed_sss_split(
  seedSplitPoints[1].y, // user's Y value as the secret
  ksnHashes,
  2, // threshold
);

console.log("\n4. User seed Y → 2-of-3 KSN split:");
for (let i = 0; i < ksnSplitPoints.length; i++) {
  console.log(
    `   KSN[${i}] ${ksnNames[i]} (y): ${toHex(ksnSplitPoints[i].y)}`,
  );
}

// 5. Combine 2 of 3 KSN shares → recover user Y
//    Use shares [0] and [2] (skip [1]) to prove any 2-of-3 works
const ksnCombinedY: number[] = wasm.seed_sss_combine(
  [ksnSplitPoints[0], ksnSplitPoints[2]],
  2,
);

const userYMatches = Buffer.from(ksnCombinedY).equals(
  Buffer.from(seedSplitPoints[1].y),
);
console.log("\n5. Combine KSN shares [0,2] → User Y:");
console.log("   Recovered:", toHex(ksnCombinedY));
console.log("   Original: ", toHex(seedSplitPoints[1].y));
console.log("   Match:", userYMatches ? "OK" : "MISMATCH!");

// 6. Combine server + user → recover original seed
const reconstructedUserShare: Point = {
  x: seedSplitPoints[1].x,
  y: ksnCombinedY,
};

const recoveredSeed: number[] = wasm.seed_sss_combine(
  [seedSplitPoints[0], reconstructedUserShare],
  2,
);

const seedMatches = Buffer.from(recoveredSeed).equals(Buffer.from(seed));
console.log("\n6. Combine server + user → Seed:");
console.log("   Recovered:", toHex(recoveredSeed));
console.log("   Original: ", toHex(seed));
console.log("   Match:", seedMatches ? "OK" : "MISMATCH!");

// 7. Derive ed25519 from recovered seed & verify
const recoveredPublicKey = ed25519.getPublicKey(new Uint8Array(recoveredSeed));
const pkMatches = Buffer.from(recoveredPublicKey).equals(
  Buffer.from(publicKey),
);
console.log("\n7. Verify ed25519 public key from recovered seed:");
console.log("   Recovered PK:", toHex(recoveredPublicKey));
console.log("   Original PK: ", toHex(publicKey));
console.log("   Match:", pkMatches ? "OK" : "MISMATCH!");

// 8. Export in Phantom/SVM standard format: bs58(seed[32] || pubkey[32])
const keypairBytes = new Uint8Array(64);
keypairBytes.set(new Uint8Array(recoveredSeed));
keypairBytes.set(recoveredPublicKey, 32);
const bs58Keypair = bs58.encode(keypairBytes);

const solanaAddress = bs58.encode(recoveredPublicKey);

console.log("\n========================================");
console.log("Phantom/SVM Export Format:");
console.log("");
console.log("  Private Key (bs58):", bs58Keypair);
console.log("  Solana Address:    ", solanaAddress);
console.log("");
console.log("  Seed (hex):        ", toHex(seed));
console.log("  Public key (hex):  ", toHex(publicKey));
console.log("========================================");

// Overall result
const allPassed = userYMatches && seedMatches && pkMatches;
console.log(
  `\n${allPassed ? "All checks passed!" : "Some checks FAILED!"}`,
);
process.exit(allPassed ? 0 : 1);
