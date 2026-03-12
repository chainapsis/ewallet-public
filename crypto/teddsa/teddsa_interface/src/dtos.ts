// NOTE: Bytes types use @oko-wallet/bytes for type-safe fixed-length byte handling
// NOTE: Use *FromRaw() to convert WASM output to Bytes types, *ToRaw() for the reverse

import {
  Bytes,
  type Bytes32,
  type Bytes64,
  type Bytes69,
  type Bytes138,
} from "@oko-wallet/bytes";
import type {
  CentralizedKeygenOutput,
  CommitmentEntry,
  KeyPackageRaw,
  PublicKeyPackageRaw,
  SignatureOutput,
  SignatureShareEntry,
  SignatureShareOutput,
  SigningCommitmentOutput,
} from "@oko-wallet/oko-types/teddsa";

export interface KeyPackage {
  identifier: Bytes32;
  signing_share: Bytes32;
  verifying_share: Bytes32;
  verifying_key: Bytes32;
  min_signers: number;
}

export interface PublicKeyPackage {
  verifying_shares: Map<string, Bytes32>;
  verifying_key: Bytes32;
}

export interface CentralizedKeygen {
  keygen_outputs: KeyPackage[];
  public_key_package: PublicKeyPackage;
}

export interface SigningCommitment {
  nonces: Bytes138;
  commitments: Bytes69;
  identifier: Bytes32;
}

export interface SignatureShare {
  signature_share: Bytes32;
  identifier: Bytes32;
}

export interface Commitment {
  identifier: Bytes32;
  commitments: Bytes69;
}

export interface SignShare {
  identifier: Bytes32;
  signature_share: Bytes32;
}

export interface Signature {
  signature: Bytes64;
}

export function keyPackageFromRaw(raw: KeyPackageRaw): KeyPackage {
  const identifier = Bytes.fromUint8Array(new Uint8Array(raw.identifier), 32);
  if (!identifier.success) {
    throw new Error(`Invalid identifier: ${identifier.err}`);
  }
  const signing_share = Bytes.fromUint8Array(
    new Uint8Array(raw.signing_share),
    32,
  );
  if (!signing_share.success) {
    throw new Error(`Invalid signing_share: ${signing_share.err}`);
  }
  const verifying_share = Bytes.fromUint8Array(
    new Uint8Array(raw.verifying_share),
    32,
  );
  if (!verifying_share.success) {
    throw new Error(`Invalid verifying_share: ${verifying_share.err}`);
  }
  const verifying_key = Bytes.fromUint8Array(
    new Uint8Array(raw.verifying_key),
    32,
  );
  if (!verifying_key.success) {
    throw new Error(`Invalid verifying_key: ${verifying_key.err}`);
  }
  return {
    identifier: identifier.data,
    signing_share: signing_share.data,
    verifying_share: verifying_share.data,
    verifying_key: verifying_key.data,
    min_signers: raw.min_signers,
  };
}

export function publicKeyPackageFromRaw(
  raw: PublicKeyPackageRaw,
): PublicKeyPackage {
  const verifying_shares = new Map<string, Bytes32>();
  for (const entry of raw.verifying_shares) {
    const shareBytes = Bytes.fromUint8Array(new Uint8Array(entry.share), 32);
    if (!shareBytes.success) {
      throw new Error(
        `Invalid verifying_share for ${entry.identifier}: ${shareBytes.err}`,
      );
    }
    verifying_shares.set(entry.identifier, shareBytes.data);
  }
  const verifying_key = Bytes.fromUint8Array(
    new Uint8Array(raw.verifying_key),
    32,
  );
  if (!verifying_key.success) {
    throw new Error(`Invalid verifying_key: ${verifying_key.err}`);
  }
  return {
    verifying_shares,
    verifying_key: verifying_key.data,
  };
}

export function centralizedKeygenFromRaw(
  raw: CentralizedKeygenOutput,
): CentralizedKeygen {
  return {
    keygen_outputs: raw.keygen_outputs.map(keyPackageFromRaw),
    public_key_package: publicKeyPackageFromRaw(raw.public_key_package),
  };
}

export function signingCommitmentFromRaw(
  raw: SigningCommitmentOutput,
): SigningCommitment {
  const nonces = Bytes.fromUint8Array(new Uint8Array(raw.nonces), 138);
  if (!nonces.success) {
    throw new Error(`Invalid nonces: ${nonces.err}`);
  }
  const commitments = Bytes.fromUint8Array(new Uint8Array(raw.commitments), 69);
  if (!commitments.success) {
    throw new Error(`Invalid commitments: ${commitments.err}`);
  }
  const identifier = Bytes.fromUint8Array(new Uint8Array(raw.identifier), 32);
  if (!identifier.success) {
    throw new Error(`Invalid identifier: ${identifier.err}`);
  }
  return {
    nonces: nonces.data,
    commitments: commitments.data,
    identifier: identifier.data,
  };
}

export function signatureShareFromRaw(
  raw: SignatureShareOutput,
): SignatureShare {
  const signature_share = Bytes.fromUint8Array(
    new Uint8Array(raw.signature_share),
    32,
  );
  if (!signature_share.success) {
    throw new Error(`Invalid signature_share: ${signature_share.err}`);
  }
  const identifier = Bytes.fromUint8Array(new Uint8Array(raw.identifier), 32);
  if (!identifier.success) {
    throw new Error(`Invalid identifier: ${identifier.err}`);
  }
  return {
    signature_share: signature_share.data,
    identifier: identifier.data,
  };
}

export function signatureFromRaw(raw: SignatureOutput): Signature {
  const signature = Bytes.fromUint8Array(new Uint8Array(raw.signature), 64);
  if (!signature.success) {
    throw new Error(`Invalid signature: ${signature.err}`);
  }
  return {
    signature: signature.data,
  };
}

export function keyPackageToRaw(pkg: KeyPackage): KeyPackageRaw {
  return {
    identifier: Array.from(pkg.identifier.toUint8Array()),
    signing_share: Array.from(pkg.signing_share.toUint8Array()),
    verifying_share: Array.from(pkg.verifying_share.toUint8Array()),
    verifying_key: Array.from(pkg.verifying_key.toUint8Array()),
    min_signers: pkg.min_signers,
  };
}

export function publicKeyPackageToRaw(
  pkg: PublicKeyPackage,
): PublicKeyPackageRaw {
  const verifying_shares: { identifier: string; share: number[] }[] = [];
  for (const [idHex, share] of pkg.verifying_shares) {
    verifying_shares.push({
      identifier: idHex,
      share: Array.from(share.toUint8Array()),
    });
  }
  return {
    verifying_shares,
    verifying_key: Array.from(pkg.verifying_key.toUint8Array()),
  };
}

export function commitmentToEntry(c: Commitment): CommitmentEntry {
  return {
    identifier: Array.from(c.identifier.toUint8Array()),
    commitments: Array.from(c.commitments.toUint8Array()),
  };
}

export function signShareToEntry(s: SignShare): SignatureShareEntry {
  return {
    identifier: Array.from(s.identifier.toUint8Array()),
    signature_share: Array.from(s.signature_share.toUint8Array()),
  };
}
