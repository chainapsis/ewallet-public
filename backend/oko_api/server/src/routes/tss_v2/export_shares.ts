import type { Response } from "express";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  ExportSharesRequest,
  ExportSharesResponse,
} from "@oko-wallet/oko-types/user";
import { decryptDataAsync } from "@oko-wallet/crypto-js/node";
import {
  ErrorResponseSchema,
  OAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  ExportSharesRequestSchema,
  ExportSharesSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import { registry } from "@oko-wallet/oko-api-openapi";
import { getUserByEmailAndAuthType } from "@oko-wallet/oko-pg-interface/oko_users";

import { validateWalletEmailAndCurveType } from "@oko-wallet-api/api/tss/utils";
import { type UserAuthenticatedRequest } from "@oko-wallet-api/middleware/auth/keplr_auth";
import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";

registry.registerPath({
  method: "post",
  path: "/tss/v2/export_shares",
  tags: ["TSS"],
  summary: "Export server shares for wallet export",
  description:
    "Exports the server's secp256k1 TSS share and ed25519 seed_share. Requires dual authentication: JWT (body.first_login_jwt) + OAuth re-authentication (Authorization Bearer id_token).",
  security: [{ userAuth: [] }],
  request: {
    headers: OAuthHeaderSchema,
    body: {
      content: {
        "application/json": {
          schema: ExportSharesRequestSchema,
        },
      },
    },
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
      description: "Unauthorized - Invalid token or user mismatch",
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

export async function exportShares(
  req: UserAuthenticatedRequest<ExportSharesRequest>,
  res: Response<OkoApiResponse<ExportSharesResponse>, OAuthLocals & Record<string, any>>,
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

    // 3. Same-user verification: OAuth identity (from oauthMiddleware) must match JWT wallets
    const { auth_type } = req.body;
    const oauthUser = res.locals.oauth_user;
    const oauthUserRes = await getUserByEmailAndAuthType(
      state.db,
      oauthUser.user_identifier,
      auth_type,
    );
    if (!oauthUserRes.success || !oauthUserRes.data) {
      res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        msg: "OAuth user not found",
      });
      return;
    }

    if (
      oauthUserRes.data.user_id !== secp256k1Wallet.user_id ||
      oauthUserRes.data.user_id !== ed25519Wallet.user_id
    ) {
      res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        msg: "User mismatch: OAuth identity does not match JWT wallets",
      });
      return;
    }

    // 4. Decrypt secp256k1 enc_tss_share (raw string, not JSON)
    const secp256k1EncryptedShare =
      secp256k1Wallet.enc_tss_share.toString("utf-8");
    const secp256k1Share = await decryptDataAsync(
      secp256k1EncryptedShare,
      state.encryption_secret,
    );

    // 5. Decrypt ed25519 enc_tss_share (JSON with signing_share, verifying_share, seed_share)
    const ed25519EncryptedShare = ed25519Wallet.enc_tss_share.toString("utf-8");
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
