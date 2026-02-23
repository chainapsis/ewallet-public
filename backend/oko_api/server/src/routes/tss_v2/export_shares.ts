import type { Response } from "express";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import { decryptDataAsync } from "@oko-wallet/crypto-js/node";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import { ExportSharesSuccessResponseSchema } from "@oko-wallet/oko-api-openapi/tss";
import { registry } from "@oko-wallet/oko-api-openapi";

import { validateWalletEmailAndCurveType } from "@oko-wallet-api/api/tss/utils";
import { type UserAuthenticatedRequest } from "@oko-wallet-api/middleware/auth/keplr_auth";

registry.registerPath({
  method: "post",
  path: "/tss/v2/export_shares",
  tags: ["TSS"],
  summary: "Export server shares for wallet export",
  description:
    "Exports the server's secp256k1 TSS share and ed25519 seed_share from the authenticated user's wallets. Used for private key export.",
  security: [{ userAuth: [] }],
  request: {
    headers: UserAuthHeaderSchema,
  },
  responses: {
    200: {
      description: "Successfully exported shares",
      content: {
        "application/json": {
          schema: ExportSharesSuccessResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid token or wallet mismatch",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

interface ExportSharesResponse {
  secp256k1_share: string;
  ed25519_seed_share: string;
}

export async function exportShares(
  req: UserAuthenticatedRequest,
  res: Response<OkoApiResponse<ExportSharesResponse>>,
) {
  const state = req.app.locals;
  const user = res.locals.user;

  try {
    // 1. Validate secp256k1 wallet
    const secp256k1ValidateRes = await validateWalletEmailAndCurveType(
      state.db,
      user.wallet_id_secp256k1,
      user.email,
      "secp256k1",
    );
    if (secp256k1ValidateRes.success === false) {
      res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        msg: secp256k1ValidateRes.err,
      });
      return;
    }

    // 2. Validate ed25519 wallet
    const ed25519ValidateRes = await validateWalletEmailAndCurveType(
      state.db,
      user.wallet_id_ed25519,
      user.email,
      "ed25519",
    );
    if (ed25519ValidateRes.success === false) {
      res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        msg: ed25519ValidateRes.err,
      });
      return;
    }

    const secp256k1Wallet = secp256k1ValidateRes.data;
    const ed25519Wallet = ed25519ValidateRes.data;

    // 3. Decrypt secp256k1 enc_tss_share (raw string, not JSON)
    const secp256k1EncryptedShare =
      secp256k1Wallet.enc_tss_share.toString("utf-8");
    const secp256k1Share = await decryptDataAsync(
      secp256k1EncryptedShare,
      state.encryption_secret,
    );

    // 4. Decrypt ed25519 enc_tss_share (JSON with signing_share, verifying_share, seed_share)
    const ed25519EncryptedShare =
      ed25519Wallet.enc_tss_share.toString("utf-8");
    const ed25519Decrypted = await decryptDataAsync(
      ed25519EncryptedShare,
      state.encryption_secret,
    );

    const ed25519StoredShares = JSON.parse(ed25519Decrypted) as {
      signing_share: number[];
      verifying_share: number[];
      seed_share: string;
    };

    if (!ed25519StoredShares.seed_share) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "seed_share not found in ed25519 wallet data",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        secp256k1_share: secp256k1Share,
        ed25519_seed_share: ed25519StoredShares.seed_share,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to export shares: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
