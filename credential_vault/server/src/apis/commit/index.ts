import { Pool } from "pg";
import type { CommitIdTokenRequest } from "@keplr-ewallet/credential-vault-interface";
import { commitIdToken } from "@keplr-ewallet/credential-vault-pg-interface";

import type { ErrorResponse } from "@keplr-ewallet-cv-server/error";
import type { Result } from "@keplr-ewallet-cv-server/utils";

export async function commitIdTokenWithUserSessionPublicKey(
  db: Pool,
  commitIdTokenRequest: CommitIdTokenRequest,
): Promise<Result<void, ErrorResponse>> {
  try {
    await commitIdToken(db, commitIdTokenRequest);

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
