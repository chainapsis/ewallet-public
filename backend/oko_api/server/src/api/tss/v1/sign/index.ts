import {
  runSignServerStep1V2,
  runSignServerStep2,
} from "@oko-wallet/cait-sith-keplr-addon/src/server";
import {
  createTssStage,
  getTssStageWithSessionData,
} from "@oko-wallet/oko-pg-interface/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  PresignStageData,
  SignStageData,
  SignStep1Request,
  SignStep1Response,
  SignStep2Request,
  SignStep2Response,
} from "@oko-wallet/oko-types/tss";
import {
  PresignStageStatus,
  SignStageStatus,
  TssSessionState,
  TssStageType,
} from "@oko-wallet/oko-types/tss";
import type { Pool } from "pg";

import {
  updateTssStageWithSessionState,
  validateTssSession,
  validateTssStage,
  validateWalletEmailAndCurveType,
} from "@oko-wallet-api/api/tss/utils";

export async function runSignStep1(
  db: Pool,
  signStep1Request: SignStep1Request,
): Promise<OkoApiResponse<SignStep1Response>> {
  try {
    const { email, wallet_id, session_id, msg, msgs_1 } = signStep1Request;

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

    const presignStage = getPresignStageWithSessionDataRes.data;

    if (!validateTssSession(presignStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(presignStage, PresignStageStatus.COMPLETED)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const getSignStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.SIGN,
    );

    if (getSignStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getSignStageWithSessionData error: ${getSignStageWithSessionDataRes.err}`,
      };
    }

    if (getSignStageWithSessionDataRes.data !== null) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const presignData = presignStage.stage_data as PresignStageData;

    const signServerStep1Result = runSignServerStep1V2(
      new Uint8Array(msg),
      presignData.presign_output!,
    );

    const createTssStageRes = await createTssStage(db, {
      session_id,
      stage_type: TssStageType.SIGN,
      stage_status: SignStageStatus.STEP_1,
      stage_data: {
        sign_state: signServerStep1Result.st_1,
        sign_messages: msgs_1,
        sign_output: null,
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
        msgs_0: signServerStep1Result.msgs_0,
      },
    };
  } catch (err) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runSignStep1 error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function runSignStep2(
  db: Pool,
  signStep2Request: SignStep2Request,
): Promise<OkoApiResponse<SignStep2Response>> {
  try {
    const { email, wallet_id, session_id, sign_output } = signStep2Request;

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
      TssStageType.SIGN,
    );

    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const signStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(signStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(signStage, SignStageStatus.STEP_1)) {
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

    const presignStage = getPresignStageWithSessionDataRes.data;
    if (!validateTssStage(presignStage, PresignStageStatus.COMPLETED)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const presignData = presignStage.stage_data as PresignStageData;
    const signData = signStage.stage_data as SignStageData;

    const signServerStep2Result = runSignServerStep2(
      signData.sign_state!,
      signData.sign_messages!,
      presignData.presign_output!,
    );
    signData.sign_output = signServerStep2Result;

    if (
      signServerStep2Result.sig.big_r !== sign_output.sig.big_r ||
      signServerStep2Result.sig.s !== sign_output.sig.s
    ) {
      return {
        success: false,
        code: "INVALID_TSS_SIGN_RESULT",
        msg: `Invalid tss sign result: ${session_id}`,
      };
    }

    const updateTssStageRes = await updateTssStageWithSessionState(
      db,
      signStage.stage_id,
      session_id,
      {
        stage_status: SignStageStatus.COMPLETED,
        stage_data: signData,
      },
      TssSessionState.COMPLETED,
    );
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
        sign_output: signServerStep2Result,
      },
    };
  } catch (err) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runSignStep2 error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
