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
  Secp256k1KeyShareV2Response,
  Ed25519KeyShareV2Response,
  PublicKeyBytes,
  Secp256k1WalletRegisterInfo,
  Ed25519WalletRegisterInfo,
  Secp256k1WalletReshareInfo,
  Ed25519WalletReshareInfo,
} from "@oko-wallet/ksn-interface/key_share";
import type { CurveType } from "@oko-wallet/ksn-interface/curve_type";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";

import {
  decryptDataAsync,
  encryptDataAsync,
} from "@oko-wallet-ksn-server/encrypt";
import { logger } from "@oko-wallet-ksn-server/logger";

/**
 * Parse secp256k1 stored share data (plain hex string).
 */
function parseSecp256k1Share(decryptedData: string): string {
  return decryptedData;
}

/**
 * Parse ed25519 stored share data (JSON with share + seed_share).
 */
function parseEd25519Share(decryptedData: string): {
  share: string;
  seed_share: string;
} {
  const parsed = JSON.parse(decryptedData);
  return { share: parsed.share, seed_share: parsed.seed_share };
}

/**
 * Serialize share data for encryption.
 * secp256k1: plain hex string
 * ed25519: JSON with share + seed_share
 */
function serializeSecp256k1Share(shareHex: string): string {
  return shareHex;
}

function serializeEd25519Share(shareHex: string, seedShare: string): string {
  return JSON.stringify({ share: shareHex, seed_share: seedShare });
}

export async function getSecp256k1WalletKeyShare(
  db: Pool | PoolClient,
  publicKey: PublicKeyBytes,
  userId: string,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<Secp256k1KeyShareV2Response>> {
  return getWalletKeyShareInternal(
    db,
    publicKey,
    userId,
    "secp256k1",
    encryptionSecret,
    (decrypted, shareId) => ({
      share_id: shareId,
      share: parseSecp256k1Share(decrypted),
    }),
  );
}

export async function getEd25519WalletKeyShare(
  db: Pool | PoolClient,
  publicKey: PublicKeyBytes,
  userId: string,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<Ed25519KeyShareV2Response>> {
  return getWalletKeyShareInternal(
    db,
    publicKey,
    userId,
    "ed25519",
    encryptionSecret,
    (decrypted, shareId) => {
      const parsed = parseEd25519Share(decrypted);
      return {
        share_id: shareId,
        share: parsed.share,
        seed_share: parsed.seed_share,
      };
    },
  );
}

async function getWalletKeyShareInternal<T>(
  db: Pool | PoolClient,
  publicKey: PublicKeyBytes,
  userId: string,
  curveType: CurveType,
  encryptionSecret: string,
  buildResponse: (decryptedData: string, shareId: string) => T,
): Promise<KSNodeApiResponse<T>> {
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

  const decryptedData = await decryptDataAsync(
    getKeyShareRes.data.enc_share.toString("utf-8"),
    encryptionSecret,
  );

  return {
    success: true,
    data: buildResponse(decryptedData, getKeyShareRes.data.share_id),
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
 * Register a secp256k1 wallet and its key share.
 */
export async function registerSecp256k1WalletKeyShare(
  db: Pool | PoolClient,
  walletInfo: Secp256k1WalletRegisterInfo,
  userId: string,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  const shareData = serializeSecp256k1Share(walletInfo.share.toHex());
  return registerWalletKeyShareInternal(
    db,
    walletInfo.public_key,
    shareData,
    userId,
    "secp256k1",
    encryptionSecret,
  );
}

/**
 * Register an ed25519 wallet and its key share.
 */
export async function registerEd25519WalletKeyShare(
  db: Pool | PoolClient,
  walletInfo: Ed25519WalletRegisterInfo,
  userId: string,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  const shareData = serializeEd25519Share(
    walletInfo.share.toHex(),
    walletInfo.seed_share,
  );
  return registerWalletKeyShareInternal(
    db,
    walletInfo.public_key,
    shareData,
    userId,
    "ed25519",
    encryptionSecret,
  );
}

async function registerWalletKeyShareInternal(
  db: Pool | PoolClient,
  publicKey: PublicKeyBytes,
  shareData: string,
  userId: string,
  curveType: CurveType,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  // Check for duplicate public key
  const getWalletRes = await getWalletByPublicKey(db, publicKey);
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
    public_key: publicKey.toUint8Array(),
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
  const encryptedShare = await encryptDataAsync(shareData, encryptionSecret);
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
 * Upsert a secp256k1 wallet's key share (for reshare).
 */
export async function upsertSecp256k1WalletKeyShare(
  db: Pool | PoolClient,
  walletInfo: Secp256k1WalletReshareInfo,
  userId: string,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  const shareData = serializeSecp256k1Share(walletInfo.share.toHex());
  return upsertWalletKeyShareInternal(
    db,
    walletInfo.public_key,
    walletInfo.share.toHex(),
    shareData,
    userId,
    "secp256k1",
    encryptionSecret,
  );
}

/**
 * Upsert an ed25519 wallet's key share (for reshare).
 */
export async function upsertEd25519WalletKeyShare(
  db: Pool | PoolClient,
  walletInfo: Ed25519WalletReshareInfo,
  userId: string,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  const shareData = serializeEd25519Share(
    walletInfo.share.toHex(),
    walletInfo.seed_share,
  );
  return upsertWalletKeyShareInternal(
    db,
    walletInfo.public_key,
    walletInfo.share.toHex(),
    shareData,
    userId,
    "ed25519",
    encryptionSecret,
  );
}

/**
 * Internal upsert logic.
 * - If wallet exists: validate share matches, update reshared_at
 * - If wallet doesn't exist: create new wallet + key share
 */
async function upsertWalletKeyShareInternal(
  db: Pool | PoolClient,
  publicKey: PublicKeyBytes,
  shareHex: string,
  shareData: string,
  userId: string,
  curveType: CurveType,
  encryptionSecret: string,
): Promise<KSNodeApiResponse<void>> {
  const getWalletRes = await getWalletByPublicKey(db, publicKey);
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
        shareData,
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

    // Extract share hex from stored data
    let existingShareHex: string;
    try {
      const parsed = JSON.parse(existingDecryptedShare);
      existingShareHex =
        typeof parsed.share === "string"
          ? parsed.share
          : existingDecryptedShare;
    } catch {
      existingShareHex = existingDecryptedShare;
    }

    // NOTE: Use constant-time comparison to prevent timing attacks
    const existingShareBuffer = Buffer.from(
      existingShareHex.toLowerCase(),
      "utf-8",
    );
    const providedShareBuffer = Buffer.from(
      shareHex.toLowerCase(),
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
    public_key: publicKey.toUint8Array(),
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
    shareData,
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
