import type { Pool } from "pg";
import {
  getUserFromUserId,
  getCommittedIdTokenByUserSessionPublicKeyAndThreshold,
  revealIdToken,
} from "@keplr-ewallet/credential-vault-pg-interface";
import { hashIdTokenWithUserSessionPublicKey } from "@keplr-ewallet/crypto-js";
import type { Bytes33 } from "@keplr-ewallet/crypto-js";

import type { ErrorResponse } from "@keplr-ewallet-cv-server/error";
import type { Result } from "@keplr-ewallet-cv-server/utils";

const COMMIT_TTL = 1000 * 60 * 3; // 3 minutes

export interface RevealRequest {
  user_id: string;
  id_token: string;
  user_session_public_key: Bytes33;
}

export interface RevealResponse {
  success: boolean;
  user_email: string;
}

export async function revealWithUserSessionPublicKey(
  db: Pool,
  revealRequest: RevealRequest,
): Promise<Result<void, ErrorResponse>> {
  try {
    const [userResult, committedIdTokenResult, idTokenHashResult] =
      await Promise.all([
        getUserFromUserId(db, revealRequest.user_id),
        getCommittedIdTokenByUserSessionPublicKeyAndThreshold(
          db,
          revealRequest.user_session_public_key,
          new Date(Date.now() - COMMIT_TTL),
        ),
        hashIdTokenWithUserSessionPublicKey(
          revealRequest.id_token,
          revealRequest.user_session_public_key,
        ),
      ]);

    if (userResult.success === false) {
      return {
        success: false,
        err: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      };
    }

    if (committedIdTokenResult.success === false) {
      return {
        success: false,
        err: {
          code: "ID_TOKEN_INVALID",
          message: "Id token not committed or expired",
        },
      };
    }

    if (idTokenHashResult.success === false) {
      return {
        success: false,
        err: {
          code: "ID_TOKEN_INVALID",
          message: "Id token hash invalid",
        },
      };
    }

    const userEmail = userResult.data.email;
    const committedIdToken = committedIdTokenResult.data;
    const idTokenHash = idTokenHashResult.data;

    if (committedIdToken.id_token_hash !== idTokenHash) {
      return {
        success: false,
        err: {
          code: "ID_TOKEN_MISMATCHED",
          message: "Id token mismatched",
        },
      };
    }

    if (!userEmail) {
      return {
        success: false,
        err: {
          code: "USER_NOT_FOUND",
          message: "User email not found",
        },
      };
    }

    await revealIdToken(db, idTokenHash);

    return { success: true, data: void 0 };
  } catch (error) {
    return {
      success: false,
      err: {
        code: "UNKNOWN_ERROR",
        message: String(error),
      },
    };
  }
}
