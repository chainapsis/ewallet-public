import { timingSafeEqual } from "crypto";
import type { Pool, PoolClient } from "pg";
import {
  createKeyShare,
  createWallet,
  getKeyShareByWalletId,
  getWalletByPublicKey,
  updateReshare,
} from "@oko-wallet/ksn-pg-interface";
import type {
  CheckWalletResult,
  GetKeyShareV2ResponseWallet,
  PublicKeyBytes,
  WalletRegisterInfo,
  WalletReshareInfo,
} from "@oko-wallet/ksn-interface/key_share";
import type { CurveType } from "@oko-wallet/ksn-interface/curve_type";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";

import {
  decryptDataAsync,
  encryptDataAsync,
} from "@oko-wallet-ksn-server/encrypt";
import { logger } from "@oko-wallet-ksn-server/logger";

export async function getWalletKeyShare(
  db: Pool | PoolClient,
  publicKey: PublicKeyBytes,
  userId: string,
  curveType: CurveType,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<GetKeyShareV2ResponseWallet>> {
  const getWalletRes = await getWalletByPublicKey(db, publicKey);
  if (getWalletRes.success === false) {
    logger.error("Failed to get wallet: %s", getWalletRes.err);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to get wallet",
    };
  }

  if (getWalletRes.data === null) {
    return {
      success: false,
      code: "WALLET_NOT_FOUND",
      msg: `Wallet not found for curve_type: ${curveType}`,
    };
  }

  if (getWalletRes.data.user_id !== userId) {
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
    logger.error("Failed to get key share: %s", getKeyShareRes.err);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to get key share",
    };
  }

  if (getKeyShareRes.data === null) {
    return {
      success: false,
      code: "KEY_SHARE_NOT_FOUND",
      msg: `Key share not found for curve_type: ${curveType}`,
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
}

export async function checkWalletKeyShare(
  db: Pool | PoolClient,
  publicKey: PublicKeyBytes,
  userId: string,
): Promise<CheckWalletResult> {
  const getWalletRes = await getWalletByPublicKey(db, publicKey);
  if (getWalletRes.success === false) {
    logger.error("Failed to get wallet: %s", getWalletRes.err);
    return { error: "Failed to get wallet" };
  }

  if (getWalletRes.data === null) {
    return { exists: false };
  }

  if (getWalletRes.data.user_id !== userId) {
    return { error: "Public key is not valid" };
  }

  const getKeyShareRes = await getKeyShareByWalletId(
    db,
    getWalletRes.data.wallet_id,
  );
  if (getKeyShareRes.success === false) {
    logger.error("Failed to get key share: %s", getKeyShareRes.err);
    return { error: "Failed to get key share" };
  }

  return { exists: getKeyShareRes.data !== null };
}

/**
 * Register a single wallet and its key share
 * Can be used within a transaction (PoolClient) or standalone (Pool)
 */
export async function registerWalletKeyShare(
  db: Pool | PoolClient,
  walletInfo: WalletRegisterInfo<PublicKeyBytes>,
  userId: string,
  curveType: CurveType,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  const { public_key, share } = walletInfo;

  // Check for duplicate public key
  const getWalletRes = await getWalletByPublicKey(db, public_key);
  if (getWalletRes.success === false) {
    logger.error("Failed to get wallet by public key: %s", getWalletRes.err);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to check wallet existence",
    };
  }

  if (getWalletRes.data !== null) {
    return {
      success: false,
      code: "DUPLICATE_PUBLIC_KEY",
      msg: `Duplicate public key for curve_type: ${curveType}`,
    };
  }

  // Create wallet
  const createWalletRes = await createWallet(db, {
    user_id: userId,
    curve_type: curveType,
    public_key: public_key.toUint8Array(),
  });
  if (createWalletRes.success === false) {
    logger.error("Failed to create wallet: %s", createWalletRes.err);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to create wallet",
    };
  }

  // Encrypt and create key share
  const encryptedShare = await encryptDataAsync(
    share.toHex(),
    encryptionSecret,
  );
  const encryptedShareBuffer = Buffer.from(encryptedShare, "utf-8");

  const createKeyShareRes = await createKeyShare(db, {
    wallet_id: createWalletRes.data.wallet_id,
    enc_share: encryptedShareBuffer,
  });
  if (createKeyShareRes.success === false) {
    logger.error("Failed to create key share: %s", createKeyShareRes.err);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to create key share",
    };
  }

  return { success: true, data: void 0 };
}

/**
 * Upsert a single wallet's key share (for unified reshare API)
 * - If wallet exists: validate share matches, update reshared_at
 * - If wallet doesn't exist: create new wallet + key share
 */
export async function upsertWalletKeyShare(
  db: Pool | PoolClient,
  walletInfo: WalletReshareInfo<PublicKeyBytes>,
  userId: string,
  curveType: CurveType,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  const { public_key, share } = walletInfo;

  const getWalletRes = await getWalletByPublicKey(db, public_key);
  if (getWalletRes.success === false) {
    logger.error("Failed to get wallet by public key: %s", getWalletRes.err);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to get wallet",
    };
  }

  // Case 1: Wallet exists -> validate share and update reshared_at
  if (getWalletRes.data !== null) {
    if (getWalletRes.data.user_id !== userId) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: "Unauthorized: wallet belongs to different user",
      };
    }

    const walletId = getWalletRes.data.wallet_id;

    const getKeyShareRes = await getKeyShareByWalletId(db, walletId);
    if (getKeyShareRes.success === false) {
      logger.error("Failed to get key share: %s", getKeyShareRes.err);
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to get key share",
      };
    }

    if (getKeyShareRes.data === null) {
      // Key share data lost but wallet exists - insert new share
      const encryptedShare = await encryptDataAsync(
        share.toHex(),
        encryptionSecret,
      );
      const encryptedShareBuffer = Buffer.from(encryptedShare, "utf-8");

      const createKeyShareRes = await createKeyShare(db, {
        wallet_id: walletId,
        enc_share: encryptedShareBuffer,
      });
      if (createKeyShareRes.success === false) {
        logger.error("Failed to create key share: %s", createKeyShareRes.err);
        return {
          success: false,
          code: "UNKNOWN_ERROR",
          msg: "Failed to create key share",
        };
      }

      return { success: true, data: void 0 };
    }

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
        msg: "Share mismatch",
      };
    }

    const updateRes = await updateReshare(db, walletId);
    if (updateRes.success === false) {
      logger.error("Failed to update reshare: %s", updateRes.err);
      return {
        success: false,
        code: "RESHARE_FAILED",
        msg: "Failed to update reshare timestamp",
      };
    }

    return { success: true, data: void 0 };
  }

  // Case 2: Wallet doesn't exist -> create new wallet + key share
  const createWalletRes = await createWallet(db, {
    user_id: userId,
    curve_type: curveType,
    public_key: public_key.toUint8Array(),
  });
  if (createWalletRes.success === false) {
    logger.error("Failed to create wallet: %s", createWalletRes.err);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to create wallet",
    };
  }

  const encryptedShare = await encryptDataAsync(
    share.toHex(),
    encryptionSecret,
  );
  const encryptedShareBuffer = Buffer.from(encryptedShare, "utf-8");

  const createKeyShareRes = await createKeyShare(db, {
    wallet_id: createWalletRes.data.wallet_id,
    enc_share: encryptedShareBuffer,
  });
  if (createKeyShareRes.success === false) {
    logger.error("Failed to create key share: %s", createKeyShareRes.err);
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Failed to create key share",
    };
  }

  return { success: true, data: void 0 };
}
