import {
  getTssSessionById,
  updateTssSessionState,
} from "@oko-wallet/oko-pg-interface/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import {
  type AbortTssSessionRequest,
  type AbortTssSessionResponse,
  TssSessionState,
} from "@oko-wallet/oko-types/tss";
import type { Pool } from "pg";

import { validateWalletEmail } from "@oko-wallet-api/api/tss/utils";

export async function abortTssSession(
  db: Pool,
  abortTssSessionRequest: AbortTssSessionRequest,
): Promise<OkoApiResponse<AbortTssSessionResponse>> {
  try {
    const { email, wallet_id, session_id } = abortTssSessionRequest;

    const validateWalletEmailRes = await validateWalletEmail(
      db,
      wallet_id,
      email,
    );
    if (validateWalletEmailRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailRes.err,
      };
    }

    const getTssSessionRes = await getTssSessionById(db, session_id);
    if (getTssSessionRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssSession error: ${getTssSessionRes.err}`,
      };
    }
    const tssSession = getTssSessionRes.data;
    if (tssSession === null) {
      return {
        success: false,
        code: "TSS_SESSION_NOT_FOUND",
        msg: `Tss session not found: ${session_id}`,
      };
    }

    if (
      tssSession.state === TssSessionState.COMPLETED ||
      tssSession.state === TssSessionState.FAILED ||
      tssSession.wallet_id !== wallet_id
    ) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    const updateTssSessionRes = await updateTssSessionState(
      db,
      session_id,
      TssSessionState.ABORTED,
    );
    if (updateTssSessionRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssSessionState error: ${updateTssSessionRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        session_id: session_id,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `abortTssSession error: ${err}`,
    };
  }
}
