import { wasmModule } from "@oko-wallet/frost-ed25519-keplr-wasm";
import type {
  CommitmentEntry,
  KeyPackageRaw,
  PublicKeyPackageRaw,
  SignatureOutput,
  SignatureShareEntry,
  SignatureShareOutput,
  SigningCommitmentOutput,
} from "@oko-wallet/oko-types/teddsa";
import type { Result } from "@oko-wallet/stdlib-js";
import {
  reqSignEd25519Round1,
  reqSignEd25519Round2,
} from "@oko-wallet/teddsa-api-lib";

import type { TeddsaKeygenOutputBytes } from "./types";

export type TeddsaSignError =
  | { type: "aborted" }
  | { type: "error"; msg: string };

/**
 * Serialize KeyPackageRaw to FROST library binary format.
 * Uses WASM to produce the correct format expected by the backend.
 */
export function serializeKeyPackage(pkg: KeyPackageRaw): number[] {
  const result: number[] = wasmModule.cli_serialize_key_package_ed25519(pkg);
  return result;
}

/**
 * Serialize PublicKeyPackageRaw to FROST library binary format.
 * Uses WASM to produce the correct format expected by the backend.
 */
export function serializePublicKeyPackage(pkg: PublicKeyPackageRaw): number[] {
  const result: number[] =
    wasmModule.cli_serialize_public_key_package_ed25519(pkg);
  return result;
}

export function teddsaSignRound1(
  keyPackage: KeyPackageRaw,
): Result<SigningCommitmentOutput, string> {
  try {
    const input = { key_package: keyPackage };
    const result: SigningCommitmentOutput =
      wasmModule.cli_sign_round1_ed25519(input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, err: String(error) };
  }
}

export function teddsaSignRound2(
  message: Uint8Array,
  keyPackage: KeyPackageRaw,
  nonces: Uint8Array,
  allCommitments: CommitmentEntry[],
): Result<SignatureShareOutput, string> {
  try {
    const input = {
      message: [...message],
      key_package: keyPackage,
      nonces: [...nonces],
      all_commitments: allCommitments,
    };
    const result: SignatureShareOutput =
      wasmModule.cli_sign_round2_ed25519(input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, err: String(error) };
  }
}

export function teddsaAggregate(
  message: Uint8Array,
  allCommitments: CommitmentEntry[],
  allSignatureShares: SignatureShareEntry[],
  publicKeyPackage: PublicKeyPackageRaw,
): Result<Uint8Array, string> {
  try {
    const input = {
      message: [...message],
      all_commitments: allCommitments,
      all_signature_shares: allSignatureShares,
      public_key_package: publicKeyPackage,
    };
    const result: SignatureOutput = wasmModule.cli_aggregate_ed25519(input);
    return { success: true, data: new Uint8Array(result.signature) };
  } catch (error: any) {
    return { success: false, err: String(error) };
  }
}

export function teddsaVerify(
  message: Uint8Array,
  signature: Uint8Array,
  publicKeyPackage: PublicKeyPackageRaw,
): Result<boolean, string> {
  try {
    const input = {
      message: [...message],
      signature: [...signature],
      public_key_package: publicKeyPackage,
    };
    const isValid: boolean = wasmModule.cli_verify_ed25519(input);
    return { success: true, data: isValid };
  } catch (error: any) {
    return { success: false, err: String(error) };
  }
}

export async function runTeddsaSign(
  endpoint: string,
  message: Uint8Array,
  keyPackage: KeyPackageRaw,
  publicKeyPackage: PublicKeyPackageRaw,
  authToken: string,
  apiKey: string,
  getIsAborted: () => boolean,
): Promise<Result<Uint8Array, TeddsaSignError>> {
  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // Round 1: Generate client commitments locally
  const round1Result = teddsaSignRound1(keyPackage);
  if (!round1Result.success) {
    return { success: false, err: { type: "error", msg: round1Result.err } };
  }

  const clientCommitment: CommitmentEntry = {
    identifier: round1Result.data.identifier,
    commitments: round1Result.data.commitments,
  };

  // Send message to server to initiate Round 1 and get server commitments
  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  const round1Resp = await reqSignEd25519Round1(
    endpoint,
    { msg: [...message] },
    authToken,
    apiKey,
  );
  if (round1Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: round1Resp.msg },
    };
  }

  const { session_id: sessionId, commitments_0: serverCommitment } =
    round1Resp.data;

  // Combine and sort commitments by identifier
  const allCommitments: CommitmentEntry[] = [
    clientCommitment,
    serverCommitment,
  ].sort((a, b) => (a.identifier[0] ?? 0) - (b.identifier[0] ?? 0));

  // Round 2: Send client commitments to server and get server signature share
  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  const round2Resp = await reqSignEd25519Round2(
    endpoint,
    {
      session_id: sessionId,
      commitments_1: clientCommitment,
    },
    authToken,
  );
  if (round2Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: round2Resp.msg },
    };
  }

  const serverSignatureShare: SignatureShareEntry =
    round2Resp.data.signature_share_0;

  // Generate client signature share locally
  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  const round2Result = teddsaSignRound2(
    message,
    keyPackage,
    new Uint8Array(round1Result.data.nonces),
    allCommitments,
  );
  if (!round2Result.success) {
    return { success: false, err: { type: "error", msg: round2Result.err } };
  }

  const clientSignatureShare: SignatureShareEntry = {
    identifier: round2Result.data.identifier,
    signature_share: round2Result.data.signature_share,
  };

  // Combine and sort signature shares by identifier
  const allSignatureShares: SignatureShareEntry[] = [
    clientSignatureShare,
    serverSignatureShare,
  ].sort((a, b) => (a.identifier[0] ?? 0) - (b.identifier[0] ?? 0));

  // Aggregate locally
  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  const aggregateResult = teddsaAggregate(
    message,
    allCommitments,
    allSignatureShares,
    publicKeyPackage,
  );
  if (!aggregateResult.success) {
    return {
      success: false,
      err: { type: "error", msg: aggregateResult.err },
    };
  }

  return { success: true, data: aggregateResult.data };
}

export async function runTeddsaSignLocal(
  message: Uint8Array,
  keygen1: TeddsaKeygenOutputBytes,
  keygen2: TeddsaKeygenOutputBytes,
): Promise<Result<Uint8Array, TeddsaSignError>> {
  try {
    const round1_1 = teddsaSignRound1(keygen1.key_package);
    if (!round1_1.success) {
      return { success: false, err: { type: "error", msg: round1_1.err } };
    }

    const round1_2 = teddsaSignRound1(keygen2.key_package);
    if (!round1_2.success) {
      return { success: false, err: { type: "error", msg: round1_2.err } };
    }

    const allCommitments: CommitmentEntry[] = [
      {
        identifier: round1_1.data.identifier,
        commitments: round1_1.data.commitments,
      },
      {
        identifier: round1_2.data.identifier,
        commitments: round1_2.data.commitments,
      },
    ].sort((a, b) => (a.identifier[0] ?? 0) - (b.identifier[0] ?? 0));

    const round2_1 = teddsaSignRound2(
      message,
      keygen1.key_package,
      new Uint8Array(round1_1.data.nonces),
      allCommitments,
    );
    if (!round2_1.success) {
      return { success: false, err: { type: "error", msg: round2_1.err } };
    }

    const round2_2 = teddsaSignRound2(
      message,
      keygen2.key_package,
      new Uint8Array(round1_2.data.nonces),
      allCommitments,
    );
    if (!round2_2.success) {
      return { success: false, err: { type: "error", msg: round2_2.err } };
    }

    const allSignatureShares: SignatureShareEntry[] = [
      {
        identifier: round2_1.data.identifier,
        signature_share: round2_1.data.signature_share,
      },
      {
        identifier: round2_2.data.identifier,
        signature_share: round2_2.data.signature_share,
      },
    ].sort((a, b) => (a.identifier[0] ?? 0) - (b.identifier[0] ?? 0));

    const aggregateResult = teddsaAggregate(
      message,
      allCommitments,
      allSignatureShares,
      keygen1.public_key_package,
    );

    if (!aggregateResult.success) {
      return {
        success: false,
        err: { type: "error", msg: aggregateResult.err },
      };
    }

    return { success: true, data: aggregateResult.data };
  } catch (error: any) {
    return { success: false, err: { type: "error", msg: String(error) } };
  }
}
