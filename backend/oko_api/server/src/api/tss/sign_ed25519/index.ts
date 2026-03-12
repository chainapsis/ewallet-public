import { decryptDataAsync } from "@oko-wallet/crypto-js/node";
import {
  createTssSession,
  createTssStage,
  getTssStageWithSessionData,
} from "@oko-wallet/oko-pg-interface/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  SignEd25519Round1Request,
  SignEd25519Round1Response,
  SignEd25519Round2Request,
  SignEd25519Round2Response,
  SignEd25519StageData,
} from "@oko-wallet/oko-types/tss";
import {
  SignEd25519StageStatus,
  TssSessionState,
  TssStageType,
} from "@oko-wallet/oko-types/tss";
import {
  reconstructKeyPackageEd25519,
  runSignRound1Ed25519,
  runSignRound2Ed25519,
} from "@oko-wallet/teddsa-addon/src/server";
import {
  Participant,
  participantToIdentifier,
} from "@oko-wallet/teddsa-interface";
import type { Pool } from "pg";

import {
  updateTssStageWithSessionState,
  validateTssSession,
  validateTssStage,
  validateWalletEmailAndCurveType,
} from "@oko-wallet-api/api/tss/utils";

export async function runSignEd25519Round1(
  db: Pool,
  encryptionSecret: string,
  request: SignEd25519Round1Request,
): Promise<OkoApiResponse<SignEd25519Round1Response>> {
  try {
    const { email, wallet_id, customer_id, msg } = request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "ed25519");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const encryptedShare = wallet.enc_tss_share.toString("utf-8");
    const decryptedShare = await decryptDataAsync(
      encryptedShare,
      encryptionSecret,
    );
    const storedShares = JSON.parse(decryptedShare) as {
      signing_share: number[];
      verifying_share: number[];
    };

    // Reconstruct key_package from stored shares
    const serverIdentifier = participantToIdentifier(Participant.P1);
    const verifyingKey = Array.from(wallet.public_key);
    const minSigners = 2;

    let keyPackageBytes: Uint8Array;
    try {
      keyPackageBytes = reconstructKeyPackageEd25519(
        new Uint8Array(storedShares.signing_share),
        new Uint8Array(storedShares.verifying_share),
        new Uint8Array(serverIdentifier),
        new Uint8Array(verifyingKey),
        minSigners,
      );
    } catch (error) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to reconstruct key_package: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    const round1Result = runSignRound1Ed25519(keyPackageBytes);

    // Create TSS session
    const sessionRes = await createTssSession(db, {
      customer_id,
      wallet_id,
    });
    if (!sessionRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to create TSS session: ${sessionRes.err}`,
      };
    }
    const session = sessionRes.data;

    // Create TSS stage with round1 data
    const stageData: SignEd25519StageData = {
      nonces: round1Result.nonces,
      identifier: round1Result.identifier,
      commitments: round1Result.commitments,
      signature_share: null,
      signature: null,
    };

    const stageRes = await createTssStage(db, {
      session_id: session.session_id,
      stage_type: TssStageType.SIGN_ED25519,
      stage_status: SignEd25519StageStatus.ROUND_1,
      stage_data: {
        ...stageData,
        msg, // Store the message for round2
      },
    });
    if (!stageRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to create TSS stage: ${stageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        session_id: session.session_id,
        commitments_0: {
          identifier: round1Result.identifier,
          commitments: round1Result.commitments,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runSignEd25519Round1 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runSignEd25519Round2(
  db: Pool,
  encryptionSecret: string,
  request: SignEd25519Round2Request,
): Promise<OkoApiResponse<SignEd25519Round2Response>> {
  try {
    const { email, wallet_id, session_id, commitments_1 } = request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "ed25519");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    // Get stage with session data
    const getStageRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.SIGN_ED25519,
    );
    if (getStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get TSS stage: ${getStageRes.err}`,
      };
    }
    const stage = getStageRes.data;

    // Validate session
    if (!validateTssSession(stage, wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: "Invalid session state or wallet mismatch",
      };
    }

    // Validate stage status
    if (!validateTssStage(stage, SignEd25519StageStatus.ROUND_1)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: "Round 1 state not found. Please call round1 first.",
      };
    }

    const stageData = stage.stage_data as SignEd25519StageData & {
      msg: number[];
    };
    const { nonces, identifier, msg } = stageData;

    if (!nonces || !identifier || !msg) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: "Missing round1 data in stage",
      };
    }

    const encryptedShare = wallet.enc_tss_share.toString("utf-8");
    const decryptedShare = await decryptDataAsync(
      encryptedShare,
      encryptionSecret,
    );
    const storedShares = JSON.parse(decryptedShare) as {
      signing_share: number[];
      verifying_share: number[];
    };

    // Reconstruct key_package from stored shares
    const serverIdentifier = participantToIdentifier(Participant.P1);
    const verifyingKey = Array.from(wallet.public_key);
    const minSigners = 2;

    let keyPackageBytes: Uint8Array;
    try {
      keyPackageBytes = reconstructKeyPackageEd25519(
        new Uint8Array(storedShares.signing_share),
        new Uint8Array(storedShares.verifying_share),
        new Uint8Array(serverIdentifier),
        new Uint8Array(verifyingKey),
        minSigners,
      );
    } catch (error) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to reconstruct key_package: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    const serverCommitment = {
      identifier,
      commitments: stageData.commitments!,
    };

    const allCommitments = [serverCommitment, commitments_1];
    allCommitments.sort((a, b) => {
      const idA = a.identifier[0] ?? 0;
      const idB = b.identifier[0] ?? 0;
      return idA - idB;
    });

    const round2Result = runSignRound2Ed25519(
      new Uint8Array(msg),
      keyPackageBytes,
      new Uint8Array(nonces),
      allCommitments,
    );

    const updateRes = await updateTssStageWithSessionState(
      db,
      stage.stage_id,
      session_id,
      {
        stage_status: SignEd25519StageStatus.COMPLETED,
        stage_data: {
          ...stageData,
          signature_share: round2Result.signature_share,
        },
      },
      TssSessionState.COMPLETED,
    );
    if (!updateRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to update TSS stage: ${updateRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        signature_share_0: {
          identifier: round2Result.identifier,
          signature_share: round2Result.signature_share,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runSignEd25519Round2 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
