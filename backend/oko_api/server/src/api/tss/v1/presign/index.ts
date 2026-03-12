import {
  runPresignServerStep1,
  runPresignServerStep2,
  runPresignServerStep3,
} from "@oko-wallet/cait-sith-keplr-addon/src/server";
import { decryptDataAsync } from "@oko-wallet/crypto-js/node";
import {
  createTssStage,
  getTssStageWithSessionData,
  updateTssStage,
} from "@oko-wallet/oko-pg-interface/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import {
  type PresignStageData,
  PresignStageStatus,
  type PresignStep1Request,
  type PresignStep1Response,
  type PresignStep2Request,
  type PresignStep2Response,
  type PresignStep3Request,
  type PresignStep3Response,
  type TriplesStageData,
  TriplesStageStatus,
  TssStageType,
} from "@oko-wallet/oko-types/tss";
import { Participant } from "@oko-wallet/tecdsa-interface";
import type { Pool } from "pg";

import {
  validateTssSession,
  validateTssStage,
  validateWalletEmailAndCurveType,
} from "@oko-wallet-api/api/tss/utils";

export async function runPresignStep1(
  db: Pool,
  presignStep1Request: PresignStep1Request,
  encryptionSecret: string,
): Promise<OkoApiResponse<PresignStep1Response>> {
  try {
    const { email, wallet_id, session_id, msgs_1 } = presignStep1Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTriplesStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.TRIPLES,
    );
    if (getTriplesStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTriplesStageWithSessionData error: ${getTriplesStageWithSessionDataRes.err}`,
      };
    }

    const triplesStage = getTriplesStageWithSessionDataRes.data;

    if (!validateTssSession(triplesStage, wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(triplesStage, TriplesStageStatus.COMPLETED)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const getPresignStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.PRESIGN,
    );

    if (getPresignStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getPresignStageWithSessionData error: ${getPresignStageWithSessionDataRes.err}`,
      };
    }

    if (getPresignStageWithSessionDataRes.data !== null) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const triplesData = triplesStage.stage_data as TriplesStageData;

    const decryptedShare = await decryptDataAsync(
      wallet.enc_tss_share.toString("utf-8"),
      encryptionSecret,
    );

    const presignStep1Result = runPresignServerStep1(
      triplesData.triple_pub_0!,
      triplesData.triple_pub_1!,
      triplesData.triple_share_0!,
      triplesData.triple_share_1!,
      {
        public_key: wallet.public_key.toString("hex"),
        private_share: decryptedShare,
      },
    );

    const createTssStageRes = await createTssStage(db, {
      session_id,
      stage_type: TssStageType.PRESIGN,
      stage_status: PresignStageStatus.STEP_1,
      stage_data: {
        presign_state: presignStep1Result.state,
        presign_messages: msgs_1,
        presign_output: null,
      },
    });
    if (createTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `createTssStage error: ${createTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        msgs_0: presignStep1Result.msgs0,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runPresignStep1 error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function runPresignStep2(
  db: Pool,
  presignStep2Request: PresignStep2Request,
): Promise<OkoApiResponse<PresignStep2Response>> {
  try {
    const { email, wallet_id, session_id, wait_1_0_1 } = presignStep2Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.PRESIGN,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const presignStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(presignStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(presignStage, PresignStageStatus.STEP_1)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const presignData = presignStage.stage_data as PresignStageData;
    presignData.presign_messages!.wait_1[Participant.P0] = wait_1_0_1;

    const presignStep2Result = runPresignServerStep2(
      presignData.presign_state!,
    );
    presignData.presign_state = presignStep2Result.state;

    const updateTssStageRes = await updateTssStage(db, presignStage.stage_id, {
      stage_status: PresignStageStatus.STEP_2,
      stage_data: presignData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        wait_1_1_0: presignStep2Result.msgs0.wait_1[Participant.P1]!,
      },
    };
  } catch (err) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runPresignStep2 error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function runPresignStep3(
  db: Pool,
  presignStep3Request: PresignStep3Request,
): Promise<OkoApiResponse<PresignStep3Response>> {
  try {
    const { email, wallet_id, session_id, presign_big_r } = presignStep3Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.PRESIGN,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const presignStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(presignStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(presignStage, PresignStageStatus.STEP_2)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const presignData = presignStage.stage_data as PresignStageData;

    const presignStep3Result = runPresignServerStep3(
      presignData.presign_state!,
      presignData.presign_messages!,
    );
    presignData.presign_output = presignStep3Result;

    if (presign_big_r !== presignStep3Result.big_r) {
      return {
        success: false,
        code: "INVALID_TSS_PRESIGN_RESULT",
        msg: `Invalid presign result: ${presign_big_r}`,
      };
    }

    const updateTssStageRes = await updateTssStage(db, presignStage.stage_id, {
      stage_status: PresignStageStatus.COMPLETED,
      stage_data: presignData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        presign_big_r: presignStep3Result.big_r,
      },
    };
  } catch (err) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runPresignStep3 error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
