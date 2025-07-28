import { Pool } from "pg";
import {
  createKeyShare,
  createUser,
  createWallet,
  getKeyShareByWalletId,
  getUserByEmail,
  getWalletByPublicKey,
} from "@keplr-ewallet/credential-vault-pg-interface";
import type {
  GetKeyShareRequest,
  GetKeyShareResponse,
  RegisterKeyShareRequest,
} from "@keplr-ewallet/credential-vault-interface";
import type { Result } from "@keplr-ewallet/stdlib-js";

import type { ErrorResponse } from "@keplr-ewallet-cv-server/error";

export async function registerKeyShare(
  db: Pool,
  registerKeyShareRequest: RegisterKeyShareRequest,
): Promise<Result<void, ErrorResponse>> {
  try {
    const { email, curve_type, public_key, enc_share } =
      registerKeyShareRequest;

    const getWalletRes = await getWalletByPublicKey(
      db,
      Buffer.from(public_key, "hex"),
    );
    if (getWalletRes.success === false) {
      return {
        success: false,
        err: {
          code: "UNKNOWN_ERROR",
          message: getWalletRes.err,
        },
      };
    }

    if (getWalletRes.data !== null) {
      return {
        success: false,
        err: {
          code: "DUPLICATE_PUBLIC_KEY",
          message: "Duplicate public key",
        },
      };
    }

    const getUserRes = await getUserByEmail(db, email);
    if (getUserRes.success === false) {
      return {
        success: false,
        err: {
          code: "UNKNOWN_ERROR",
          message: getUserRes.err,
        },
      };
    }

    let user_id: string;
    if (getUserRes.data === null) {
      const createUserRes = await createUser(db, email);
      if (createUserRes.success === false) {
        return {
          success: false,
          err: {
            code: "UNKNOWN_ERROR",
            message: createUserRes.err,
          },
        };
      }
      user_id = createUserRes.data.user_id;
    } else {
      user_id = getUserRes.data.user_id;
    }

    const createWalletRes = await createWallet(db, {
      user_id,
      curve_type,
      public_key: Buffer.from(public_key, "hex"),
    });
    if (createWalletRes.success === false) {
      return {
        success: false,
        err: {
          code: "UNKNOWN_ERROR",
          message: createWalletRes.err,
        },
      };
    }

    const wallet_id = createWalletRes.data.wallet_id;

    console.log("enc_share", Buffer.from(enc_share, "hex"));

    const createKeyShareRes = await createKeyShare(db, {
      wallet_id,
      enc_share: Buffer.from(enc_share, "hex"),
    });
    if (createKeyShareRes.success === false) {
      return {
        success: false,
        err: {
          code: "UNKNOWN_ERROR",
          message: createKeyShareRes.err,
        },
      };
    }

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

export async function getKeyShare(
  db: Pool,
  getKeyShareRequest: GetKeyShareRequest,
): Promise<Result<GetKeyShareResponse, ErrorResponse>> {
  try {
    const { email, public_key } = getKeyShareRequest;

    const getUserRes = await getUserByEmail(db, email);
    if (getUserRes.success === false) {
      return {
        success: false,
        err: {
          code: "UNKNOWN_ERROR",
          message: getUserRes.err,
        },
      };
    }

    if (getUserRes.data === null) {
      return {
        success: false,
        err: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      };
    }

    const getWalletRes = await getWalletByPublicKey(
      db,
      Buffer.from(public_key, "hex"),
    );
    if (getWalletRes.success === false) {
      return {
        success: false,
        err: {
          code: "UNKNOWN_ERROR",
          message: getWalletRes.err,
        },
      };
    }
    if (getWalletRes.data === null) {
      return {
        success: false,
        err: {
          code: "WALLET_NOT_FOUND",
          message: "Wallet not found",
        },
      };
    }
    if (getWalletRes.data.user_id !== getUserRes.data.user_id) {
      return {
        success: false,
        err: {
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        },
      };
    }

    const getKeyShareRes = await getKeyShareByWalletId(
      db,
      getWalletRes.data.wallet_id,
    );
    if (getKeyShareRes.success === false) {
      return {
        success: false,
        err: {
          code: "UNKNOWN_ERROR",
          message: getKeyShareRes.err,
        },
      };
    }

    if (getKeyShareRes.data === null) {
      return {
        success: false,
        err: {
          code: "KEY_SHARE_NOT_FOUND",
          message: "Key share not found",
        },
      };
    }

    return {
      success: true,
      data: {
        share_id: getKeyShareRes.data.share_id,
        enc_share: getKeyShareRes.data.enc_share.toString("hex"),
      },
    };
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
