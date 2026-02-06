// NOTE: NAPI addon returns serialized bytes, different from WASM Raw types
import type {
  CommitmentEntry,
  SignatureShareEntry,
} from "@oko-wallet/oko-types/teddsa";

import {
  napiKeygenCentralizedEd25519,
  napiKeygenImportEd25519,
  napiSignRound1Ed25519,
  napiSignRound2Ed25519,
  napiAggregateEd25519,
  napiVerifyEd25519,
  napiExtractKeyPackageSharesEd25519,
  napiReconstructKeyPackageEd25519,
  napiReconstructPublicKeyPackageEd25519,
  napiSssSplitEd25519,
  napiSssCombineEd25519,
  napiSssExtendEd25519,
} from "../../addon/index.js";

// NOTE: NAPI-specific types (serialized bytes format)
export interface NapiKeygenOutput {
  key_package: number[];
  public_key_package: number[];
  identifier: number[];
}

export interface NapiCentralizedKeygenOutput {
  private_key: number[];
  keygen_outputs: NapiKeygenOutput[];
  public_key: number[];
}

export interface NapiSigningCommitmentOutput {
  nonces: number[];
  commitments: number[];
  identifier: number[];
}

export interface NapiSignatureShareOutput {
  signature_share: number[];
  identifier: number[];
}

export interface NapiSignatureOutput {
  signature: number[];
}

export interface NapiKeyPackageShares {
  signing_share: number[];
  verifying_share: number[];
}

export function runKeygenCentralizedEd25519(): NapiCentralizedKeygenOutput {
  return napiKeygenCentralizedEd25519();
}

export function runKeygenImportEd25519(
  secretKey: Uint8Array,
): NapiCentralizedKeygenOutput {
  return napiKeygenImportEd25519(Array.from(secretKey));
}

export function runSignRound1Ed25519(
  keyPackage: Uint8Array,
): NapiSigningCommitmentOutput {
  return napiSignRound1Ed25519(Array.from(keyPackage));
}

export function runSignRound2Ed25519(
  message: Uint8Array,
  keyPackage: Uint8Array,
  nonces: Uint8Array,
  allCommitments: CommitmentEntry[],
): NapiSignatureShareOutput {
  return napiSignRound2Ed25519(
    Array.from(message),
    Array.from(keyPackage),
    Array.from(nonces),
    allCommitments,
  );
}

export function runAggregateEd25519(
  message: Uint8Array,
  allCommitments: CommitmentEntry[],
  allSignatureShares: SignatureShareEntry[],
  publicKeyPackage: Uint8Array,
): NapiSignatureOutput {
  return napiAggregateEd25519(
    Array.from(message),
    allCommitments,
    allSignatureShares,
    Array.from(publicKeyPackage),
  );
}

export function runVerifyEd25519(
  message: Uint8Array,
  signature: Uint8Array,
  publicKeyPackage: Uint8Array,
): boolean {
  return napiVerifyEd25519(
    Array.from(message),
    Array.from(signature),
    Array.from(publicKeyPackage),
  );
}

export function extractKeyPackageSharesEd25519(
  keyPackage: Uint8Array,
): NapiKeyPackageShares {
  return napiExtractKeyPackageSharesEd25519(Array.from(keyPackage));
}

export function reconstructKeyPackageEd25519(
  signingShare: Uint8Array,
  verifyingShare: Uint8Array,
  identifier: Uint8Array,
  verifyingKey: Uint8Array,
  minSigners: number,
): Uint8Array {
  return new Uint8Array(
    napiReconstructKeyPackageEd25519(
      Array.from(signingShare),
      Array.from(verifyingShare),
      Array.from(identifier),
      Array.from(verifyingKey),
      minSigners,
    ),
  );
}

export function reconstructPublicKeyPackageEd25519(
  clientVerifyingShare: Uint8Array,
  clientIdentifier: Uint8Array,
  serverVerifyingShare: Uint8Array,
  serverIdentifier: Uint8Array,
  verifyingKey: Uint8Array,
): Uint8Array {
  return new Uint8Array(
    napiReconstructPublicKeyPackageEd25519(
      Array.from(clientVerifyingShare),
      Array.from(clientIdentifier),
      Array.from(serverVerifyingShare),
      Array.from(serverIdentifier),
      Array.from(verifyingKey),
    ),
  );
}

// ============================================================================
// SSS (Shamir's Secret Sharing) Functions
// ============================================================================

export interface NapiSssSplitOutput {
  key_packages: NapiKeygenOutput[];
}

export interface NapiSssExtendOutput {
  new_key_packages: NapiKeygenOutput[];
  public_key_package: number[];
}

/**
 * Split a signing share into SSS shares for distribution to KSN nodes.
 *
 * @param signingShare - 32-byte signing share to split
 * @param identifiers - Array of 32-byte identifiers (one per node)
 * @param minSigners - Minimum shares required to reconstruct (threshold)
 * @returns Key packages for each identifier
 */
export function sssSplitEd25519(
  signingShare: Uint8Array,
  identifiers: Uint8Array[],
  minSigners: number,
): NapiSssSplitOutput {
  return napiSssSplitEd25519(
    Array.from(signingShare),
    identifiers.map((id) => Array.from(id)),
    minSigners,
  );
}

/**
 * Combine SSS shares to recover the original signing share.
 *
 * @param keyPackages - Serialized key packages (at least threshold required)
 * @returns Recovered 32-byte signing share
 */
export function sssCombineEd25519(keyPackages: Uint8Array[]): Uint8Array {
  return new Uint8Array(
    napiSssCombineEd25519(keyPackages.map((kp) => Array.from(kp))),
  );
}

/**
 * Extend existing shares to add new participants without changing the polynomial.
 * Used when a KSN node loses data and needs a new share computed from remaining nodes.
 *
 * @param keyPackages - Key packages from active nodes (at least threshold required)
 * @param newIdentifiers - 32-byte identifiers for new participants
 * @param publicKeyPackage - Existing public key package
 * @returns New key packages for the additional identifiers
 */
export function sssExtendEd25519(
  keyPackages: Uint8Array[],
  newIdentifiers: Uint8Array[],
  publicKeyPackage: Uint8Array,
): NapiSssExtendOutput {
  return napiSssExtendEd25519(
    keyPackages.map((kp) => Array.from(kp)),
    newIdentifiers.map((id) => Array.from(id)),
    Array.from(publicKeyPackage),
  );
}
