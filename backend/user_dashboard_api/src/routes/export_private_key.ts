// Temporary API for testing the export_private_key flow.

import { getWalletById } from "@oko-wallet/oko-pg-interface/oko_wallets";
import { decryptDataAsync } from "@oko-wallet/crypto-js/node";
import type { OkoApiResponse } from "@oko-wallet-types/api_response";
import type { Response } from "express";
import type { Pool } from "pg";

import type { UserAuthenticatedRequest } from "@oko-wallet-usrd-api/middleware/auth";

interface ExportPrivateKeyData {
  secp256k1: string;
  ed25519: string;
}

export async function exportPrivateKey(
  req: UserAuthenticatedRequest,
  res: Response<OkoApiResponse<ExportPrivateKeyData>>,
) {
  try {
    const state = req.app.locals as {
      db: Pool;
      encryption_secret: string;
    };
    const { wallet_id_secp256k1, wallet_id_ed25519 } = res.locals.user as {
      email: string;
      wallet_id_secp256k1: string;
      wallet_id_ed25519: string;
    };

    // 1. Fetch secp256k1 wallet
    const secp256k1WalletRes = await getWalletById(
      state.db,
      wallet_id_secp256k1,
    );
    if (!secp256k1WalletRes.success || !secp256k1WalletRes.data) {
      res.status(500).json({
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: "secp256k1 wallet not found",
      });
      return;
    }

    // 2. Fetch ed25519 wallet
    const ed25519WalletRes = await getWalletById(state.db, wallet_id_ed25519);
    if (!ed25519WalletRes.success || !ed25519WalletRes.data) {
      res.status(500).json({
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: "ed25519 wallet not found",
      });
      return;
    }

    // 3. Decrypt server shares
    const decryptedSecp256k1Share = await decryptDataAsync(
      secp256k1WalletRes.data.enc_tss_share.toString("utf-8"),
      state.encryption_secret,
    );

    const decryptedEd25519Share = await decryptDataAsync(
      ed25519WalletRes.data.enc_tss_share.toString("utf-8"),
      state.encryption_secret,
    );

    // secp256k1: the decrypted share is the hex scalar (keyshare_0)
    // ed25519: the decrypted share is JSON { signing_share: number[], verifying_share: number[] }
    const ed25519SharesData = JSON.parse(decryptedEd25519Share) as {
      signing_share: number[];
      verifying_share: number[];
    };

    // Convert ed25519 signing_share (number[]) to hex string
    const ed25519SigningShareHex = Buffer.from(
      ed25519SharesData.signing_share,
    ).toString("hex");

    res.status(200).json({
      success: true,
      data: {
        secp256k1: decryptedSecp256k1Share,
        ed25519: ed25519SigningShareHex,
      },
    });
    return;
  } catch (error) {
    console.error("Export private key error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
    return;
  }
}
