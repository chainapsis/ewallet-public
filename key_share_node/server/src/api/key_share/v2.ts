import type { Pool, PoolClient } from "pg";
import {
  createUser,
  getUserByAuthTypeAndUserAuthId,
  getWalletsByUserId,
} from "@oko-wallet/ksn-pg-interface";
import type {
  CheckKeyShareV2Request,
  CheckKeyShareV2Response,
  GetKeyShareV2Request,
  GetKeyShareV2Response,
  RegisterKeyShareV2Request,
  RegisterEd25519V2Request,
  ReshareKeyShareV2Request,
} from "@oko-wallet/ksn-interface/key_share";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";

import { logger } from "@oko-wallet-ksn-server/logger";
import {
  checkWalletKeyShare,
  getSecp256k1WalletKeyShare,
  getEd25519WalletKeyShare,
  registerSecp256k1WalletKeyShare,
  registerEd25519WalletKeyShare,
  upsertSecp256k1WalletKeyShare,
  upsertEd25519WalletKeyShare,
} from "./helper";

/**
 * Get multiple key shares at once (v2)
 *
 * Unlike v1, this endpoint accepts wallets as an object { secp256k1?: pk, ed25519?: pk }
 * and returns key shares in the same structure.
 * All requested wallets must exist and belong to the authenticated user.
 */
export async function getKeyShareV2(
  db: Pool | PoolClient,
  request: GetKeyShareV2Request,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<GetKeyShareV2Response>> {
  try {
    const { user_auth_id, auth_type, wallets } = request;

    const getUserRes = await getUserByAuthTypeAndUserAuthId(
      db,
      auth_type,
      user_auth_id,
    );
    if (getUserRes.success === false) {
      logger.error("Failed to get user: %s", getUserRes.err);
      return {
        success: false,
        code: "USER_NOT_FOUND",
        msg: "Failed to get user",
      };
    }

    if (getUserRes.data === null) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        msg: "User not found",
      };
    }

    const userId = getUserRes.data.user_id;

    const [secp256k1Res, ed25519Res] = await Promise.all([
      wallets.secp256k1
        ? getSecp256k1WalletKeyShare(
            db,
            wallets.secp256k1,
            userId,
            encryptionSecret,
          )
        : null,
      wallets.ed25519
        ? getEd25519WalletKeyShare(
            db,
            wallets.ed25519,
            userId,
            encryptionSecret,
          )
        : null,
    ]);

    if (secp256k1Res?.success === false) {
      return secp256k1Res;
    }
    if (ed25519Res?.success === false) {
      return ed25519Res;
    }

    const result: GetKeyShareV2Response = {};
    if (secp256k1Res) {
      result.secp256k1 = secp256k1Res.data;
    }
    if (ed25519Res) {
      result.ed25519 = ed25519Res.data;
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error("Failed to get key shares: %s", error);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to get key shares",
    };
  }
}

/**
 * Check existence of multiple key shares at once (v2)
 *
 * Unlike v1, this endpoint accepts wallets as an object { secp256k1?: pk, ed25519?: pk }
 * and returns existence status in the same structure.
 * No authentication required (same as v1).
 */
export async function checkKeyShareV2(
  db: Pool | PoolClient,
  request: CheckKeyShareV2Request,
): Promise<KSNodeApiResponse<CheckKeyShareV2Response>> {
  try {
    const { user_auth_id, auth_type, wallets } = request;

    const getUserRes = await getUserByAuthTypeAndUserAuthId(
      db,
      auth_type,
      user_auth_id,
    );
    if (getUserRes.success === false) {
      logger.error("Failed to get user: %s", getUserRes.err);
      return {
        success: false,
        code: "USER_NOT_FOUND",
        msg: "Failed to get user",
      };
    }

    // User not found = all wallets don't exist
    if (getUserRes.data === null) {
      const result: CheckKeyShareV2Response = {};
      if (wallets.secp256k1) {
        result.secp256k1 = { exists: false };
      }
      if (wallets.ed25519) {
        result.ed25519 = { exists: false };
      }
      return { success: true, data: result };
    }

    const userId = getUserRes.data.user_id;

    const [secp256k1Res, ed25519Res] = await Promise.all([
      wallets.secp256k1
        ? checkWalletKeyShare(db, wallets.secp256k1, userId)
        : null,
      wallets.ed25519 ? checkWalletKeyShare(db, wallets.ed25519, userId) : null,
    ]);

    if (secp256k1Res && "error" in secp256k1Res) {
      return {
        success: false,
        code: "PUBLIC_KEY_INVALID",
        msg: secp256k1Res.error,
      };
    }
    if (ed25519Res && "error" in ed25519Res) {
      return {
        success: false,
        code: "PUBLIC_KEY_INVALID",
        msg: ed25519Res.error,
      };
    }

    const result: CheckKeyShareV2Response = {};
    if (secp256k1Res) {
      result.secp256k1 = secp256k1Res;
    }
    if (ed25519Res) {
      result.ed25519 = ed25519Res;
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error("Failed to check key shares: %s", error);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to check key shares",
    };
  }
}

/**
 * Register multiple key shares at once (v2)
 *
 * This endpoint requires BOTH wallets: { secp256k1: {...}, ed25519: {...} }
 * Each wallet contains public_key and share.
 * All wallets are registered atomically within a single transaction.
 */
export async function registerKeyShareV2(
  db: Pool,
  request: RegisterKeyShareV2Request,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  const { user_auth_id, auth_type, wallets } = request;

  // Validate that both wallets are provided
  if (!wallets.secp256k1 || !wallets.ed25519) {
    return {
      success: false,
      code: "INVALID_REQUEST",
      msg: "Both secp256k1 and ed25519 wallets are required",
    };
  }

  try {
    // 1. Check if user exists
    const getUserRes = await getUserByAuthTypeAndUserAuthId(
      db,
      auth_type,
      user_auth_id,
    );
    if (getUserRes.success === false) {
      throw new Error(
        `Failed to getUserByAuthTypeAndUserAuthId: ${getUserRes.err}`,
      );
    }

    const existingUser = getUserRes.data;

    // 2. Start transaction only for write operations
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      let userId: string;
      if (existingUser === null) {
        // New user - create
        const createUserRes = await createUser(client, auth_type, user_auth_id);
        if (createUserRes.success === false) {
          throw new Error(`Failed to createUser: ${createUserRes.err}`);
        }
        userId = createUserRes.data.user_id;
      } else {
        userId = existingUser.user_id;
      }

      // Register each wallet
      if (wallets.secp256k1) {
        const res = await registerSecp256k1WalletKeyShare(
          client,
          wallets.secp256k1,
          userId,
          encryptionSecret,
        );
        if (res.success === false) {
          await client.query("ROLLBACK");
          return res;
        }
      }

      if (wallets.ed25519) {
        const res = await registerEd25519WalletKeyShare(
          client,
          wallets.ed25519,
          userId,
          encryptionSecret,
        );
        if (res.success === false) {
          await client.query("ROLLBACK");
          return res;
        }
      }

      await client.query("COMMIT");
      return { success: true, data: void 0 };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Failed to register key shares: %s", error);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to register key shares",
    };
  }
}

/**
 * Register ed25519 wallet for existing users (v2)
 *
 * This endpoint is for users who already have secp256k1 wallet.
 * It only registers ed25519 wallet, not secp256k1.
 */
export async function registerEd25519V2(
  db: Pool,
  request: RegisterEd25519V2Request,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  const { user_auth_id, auth_type, public_key, share, seed_share } = request;

  try {
    // 1. Check if user exists
    const getUserRes = await getUserByAuthTypeAndUserAuthId(
      db,
      auth_type,
      user_auth_id,
    );
    if (getUserRes.success === false) {
      throw new Error(
        `Failed to getUserByAuthTypeAndUserAuthId: ${getUserRes.err}`,
      );
    }

    if (getUserRes.data === null) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        msg: "User not found",
      };
    }

    const userId = getUserRes.data.user_id;

    // 2. Check existing wallets
    const getWalletsRes = await getWalletsByUserId(db, userId);
    if (getWalletsRes.success === false) {
      throw new Error(`Failed to getWalletsByUserId: ${getWalletsRes.err}`);
    }

    const existingWallets = getWalletsRes.data;
    const secp256k1Wallet = existingWallets.find(
      (w) => w.curve_type === "secp256k1",
    );

    // Must have secp256k1 wallet (existing user)
    if (!secp256k1Wallet) {
      return {
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: "secp256k1 wallet not found (not an existing user)",
      };
    }

    // 3. Register ed25519 wallet
    return await registerEd25519WalletKeyShare(
      db,
      { public_key, share, seed_share },
      userId,
      encryptionSecret,
    );
  } catch (error) {
    logger.error("Failed to register ed25519 wallet: %s", error);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to register ed25519 wallet",
    };
  }
}

/**
 * Reshare multiple key shares at once (v2)
 *
 * This endpoint requires BOTH wallets: { secp256k1: {...}, ed25519: {...} }
 * Each wallet contains public_key and share.
 *
 * For each wallet:
 * - If wallet exists: validates that provided share matches existing share, then updates reshared_at
 * - If wallet doesn't exist: registers new wallet with the provided share
 *
 * This unified approach eliminates the need for separate reshare/reshare_register APIs.
 * Both wallets are always processed together to ensure consistency.
 */
export async function reshareKeyShareV2(
  db: Pool,
  request: ReshareKeyShareV2Request,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  const { user_auth_id, auth_type, wallets } = request;

  // Validate that both wallets are provided
  if (!wallets.secp256k1 || !wallets.ed25519) {
    return {
      success: false,
      code: "INVALID_REQUEST",
      msg: "Both secp256k1 and ed25519 wallets are required",
    };
  }

  try {
    // 1. Check if user exists
    const getUserRes = await getUserByAuthTypeAndUserAuthId(
      db,
      auth_type,
      user_auth_id,
    );
    if (getUserRes.success === false) {
      logger.error("Failed to get user: %s", getUserRes.err);
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to get user",
      };
    }

    const existingUser = getUserRes.data;

    // 2. Start transaction for atomicity
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      let userId: string;
      if (existingUser === null) {
        // New user on this node - create
        const createUserRes = await createUser(client, auth_type, user_auth_id);
        if (createUserRes.success === false) {
          throw new Error(`Failed to createUser: ${createUserRes.err}`);
        }
        userId = createUserRes.data.user_id;
      } else {
        userId = existingUser.user_id;
      }

      // 3. Upsert both wallets (validate + update if exists, register if not)
      const secp256k1Res = await upsertSecp256k1WalletKeyShare(
        client,
        wallets.secp256k1,
        userId,
        encryptionSecret,
      );
      if (secp256k1Res.success === false) {
        await client.query("ROLLBACK");
        return secp256k1Res;
      }

      const ed25519Res = await upsertEd25519WalletKeyShare(
        client,
        wallets.ed25519,
        userId,
        encryptionSecret,
      );
      if (ed25519Res.success === false) {
        await client.query("ROLLBACK");
        return ed25519Res;
      }

      await client.query("COMMIT");
      return { success: true, data: void 0 };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Failed to reshare key shares: %s", error);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to reshare key shares",
    };
  }
}
