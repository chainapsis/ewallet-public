import type {
  CheckKeyShareRequest,
  CheckKeyShareResponse,
  GetKeyShareRequest,
  GetKeyShareResponse,
  RegisterKeyShareRequest,
  ReshareKeyShareRequest,
} from "@oko-wallet/ksn-interface/key_share";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";
import {
  createKeyShare,
  createUser,
  createWallet,
  getKeyShareByWalletId,
  getUserByAuthTypeAndUserAuthId,
  getWalletByPublicKey,
  updateReshare,
} from "@oko-wallet/ksn-pg-interface";
import { timingSafeEqual } from "crypto";
import type { Pool, PoolClient } from "pg";

import {
  decryptDataAsync,
  encryptDataAsync,
} from "@oko-wallet-ksn-server/encrypt";

export async function registerKeyShare(
  db: Pool,
  registerKeyShareRequest: RegisterKeyShareRequest,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  try {
    const { user_auth_id, auth_type, curve_type, public_key, share } =
      registerKeyShareRequest;

    if (curve_type !== "secp256k1" && curve_type !== "ed25519") {
      return {
        success: false,
        code: "CURVE_TYPE_NOT_SUPPORTED",
        msg: `Curve type not supported: ${curve_type}`,
      };
    }

    const getWalletRes = await getWalletByPublicKey(db, public_key);
    if (getWalletRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to getWalletByPublicKey: ${getWalletRes.err}`,
      };
    }

    if (getWalletRes.data !== null) {
      return {
        success: false,
        code: "DUPLICATE_PUBLIC_KEY",
        msg: `Duplicate public key: ${public_key.toHex()}`,
      };
    }

    const getUserRes = await getUserByAuthTypeAndUserAuthId(
      db,
      auth_type,
      user_auth_id,
    );
    if (getUserRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to getUserByAuthTypeAndUserAuthId: ${getUserRes.err}`,
      };
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      let user_id: string;
      if (getUserRes.data === null) {
        const createUserRes = await createUser(client, auth_type, user_auth_id);
        if (createUserRes.success === false) {
          throw new Error(`Failed to createUser: ${createUserRes.err}`);
        }

        user_id = createUserRes.data.user_id;
      } else {
        user_id = getUserRes.data.user_id;
      }

      const createWalletRes = await createWallet(client, {
        user_id,
        curve_type,
        public_key: public_key.toUint8Array(),
      });
      if (createWalletRes.success === false) {
        throw new Error(`Failed to createWallet: ${createWalletRes.err}`);
      }

      const wallet_id = createWalletRes.data.wallet_id;

      const encryptedShare = await encryptDataAsync(
        share.toHex(),
        encryptionSecret,
      );
      const encryptedShareBuffer = Buffer.from(encryptedShare, "utf-8");

      const createKeyShareRes = await createKeyShare(client, {
        wallet_id,
        enc_share: encryptedShareBuffer,
      });
      if (createKeyShareRes.success === false) {
        throw new Error(`Failed to createKeyShare: ${createKeyShareRes.err}`);
      }

      await client.query("COMMIT");
      return { success: true, data: void 0 };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: String(error),
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: String(error),
    };
  }
}

export async function getKeyShare(
  db: Pool | PoolClient,
  getKeyShareRequest: GetKeyShareRequest,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<GetKeyShareResponse>> {
  try {
    const { user_auth_id, auth_type, public_key } = getKeyShareRequest;

    const getUserRes = await getUserByAuthTypeAndUserAuthId(
      db,
      auth_type,
      user_auth_id,
    );
    if (getUserRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to getUserByAuthTypeAndUserAuthId: ${getUserRes.err}`,
      };
    }

    if (getUserRes.data === null) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        msg: `User not found: ${user_auth_id} (auth_type: ${auth_type})`,
      };
    }

    const getWalletRes = await getWalletByPublicKey(db, public_key);
    if (getWalletRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to getWalletByPublicKey: ${getWalletRes.err}`,
      };
    }
    if (getWalletRes.data === null) {
      return {
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: `Wallet not found: ${public_key.toHex()}`,
      };
    }
    if (getWalletRes.data.user_id !== getUserRes.data.user_id) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: "Unauthorized: wallet belongs to different user",
      };
    }

    const getKeyShareRes = await getKeyShareByWalletId(
      db,
      getWalletRes.data.wallet_id,
    );
    if (getKeyShareRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to getKeyShareByWalletId: ${getKeyShareRes.err}`,
      };
    }

    if (getKeyShareRes.data === null) {
      return {
        success: false,
        code: "KEY_SHARE_NOT_FOUND",
        msg: "Key share not found",
      };
    }

    const decryptedShare = await decryptDataAsync(
      getKeyShareRes.data.enc_share.toString("utf-8"),
      encryptionSecret,
    );

    return {
      success: true,
      data: {
        share_id: getKeyShareRes.data.share_id,
        share: decryptedShare,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: String(error),
    };
  }
}

export async function reshareKeyShare(
  db: Pool | PoolClient,
  reshareKeyShareRequest: ReshareKeyShareRequest,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  try {
    const { user_auth_id, auth_type, curve_type, public_key, share } =
      reshareKeyShareRequest;

    if (curve_type !== "secp256k1" && curve_type !== "ed25519") {
      return {
        success: false,
        code: "CURVE_TYPE_NOT_SUPPORTED",
        msg: `Curve type not supported: ${curve_type}`,
      };
    }

    const getWalletRes = await getWalletByPublicKey(db, public_key);
    if (getWalletRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to getWalletByPublicKey: ${getWalletRes.err}`,
      };
    }
    if (getWalletRes.data === null) {
      return {
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: `Wallet not found: ${public_key.toHex()}`,
      };
    }

    const wallet_id = getWalletRes.data.wallet_id;

    // Get user to verify ownership
    const getUserRes = await getUserByAuthTypeAndUserAuthId(
      db,
      auth_type,
      user_auth_id,
    );
    if (getUserRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to getUserByAuthTypeAndUserAuthId: ${getUserRes.err}`,
      };
    }

    if (getUserRes.data === null) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        msg: `User not found: ${user_auth_id} (auth_type: ${auth_type})`,
      };
    }

    // Verify wallet belongs to user
    if (getWalletRes.data.user_id !== getUserRes.data.user_id) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: "Unauthorized: wallet belongs to different user",
      };
    }

    const getKeyShareRes = await getKeyShareByWalletId(
      db,
      getWalletRes.data.wallet_id,
    );
    if (getKeyShareRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to getKeyShareByWalletId: ${getKeyShareRes.err}`,
      };
    }

    if (getKeyShareRes.data === null) {
      return {
        success: false,
        code: "KEY_SHARE_NOT_FOUND",
        msg: "Key share not found",
      };
    }

    // Validate that the new share matches the existing share
    const existingDecryptedShare = await decryptDataAsync(
      getKeyShareRes.data.enc_share.toString("utf-8"),
      encryptionSecret,
    );

    // NOTE: Use constant-time comparison to prevent timing attacks
    const existingShareBuffer = Buffer.from(
      existingDecryptedShare.toLowerCase(),
      "utf-8",
    );
    const providedShareBuffer = Buffer.from(
      share.toHex().toLowerCase(),
      "utf-8",
    );

    if (
      existingShareBuffer.length !== providedShareBuffer.length ||
      !timingSafeEqual(existingShareBuffer, providedShareBuffer)
    ) {
      return {
        success: false,
        code: "RESHARE_FAILED",
        msg: "New share does not match existing share",
      };
    }

    const updateKeyShareRes = await updateReshare(db, wallet_id);
    if (updateKeyShareRes.success === false) {
      return {
        success: false,
        code: "RESHARE_FAILED",
        msg: `Failed to updateReshare: ${updateKeyShareRes.err}`,
      };
    }

    return { success: true, data: void 0 };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: String(error),
    };
  }
}

export async function checkKeyShare(
  db: Pool | PoolClient,
  checkKeyShareRequest: CheckKeyShareRequest,
): Promise<KSNodeApiResponse<CheckKeyShareResponse>> {
  try {
    const { user_auth_id, auth_type, public_key } = checkKeyShareRequest;

    const getUserRes = await getUserByAuthTypeAndUserAuthId(
      db,
      auth_type,
      user_auth_id,
    );
    if (getUserRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to getUserByAuthTypeAndUserAuthId: ${getUserRes.err}`,
      };
    }
    if (getUserRes.data === null) {
      return {
        success: true,
        data: {
          exists: false,
        },
      };
    }

    const getWalletRes = await getWalletByPublicKey(db, public_key);
    if (getWalletRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to getWalletByPublicKey: ${getWalletRes.err}`,
      };
    }
    if (getWalletRes.data === null) {
      return {
        success: true,
        data: {
          exists: false,
        },
      };
    }
    if (getWalletRes.data.user_id !== getUserRes.data.user_id) {
      return {
        success: false,
        code: "PUBLIC_KEY_INVALID",
        msg: "Public key is not valid",
      };
    }

    const getKeyShareRes = await getKeyShareByWalletId(
      db,
      getWalletRes.data.wallet_id,
    );
    if (getKeyShareRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to getKeyShareByWalletId: ${getKeyShareRes.err}`,
      };
    }

    if (getKeyShareRes.data === null) {
      return {
        success: true,
        data: {
          exists: false,
        },
      };
    }

    return {
      success: true,
      data: {
        exists: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: String(error),
    };
  }
}
