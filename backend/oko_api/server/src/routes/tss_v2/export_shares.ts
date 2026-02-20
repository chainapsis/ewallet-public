import type { Response } from "express";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type {
  ExportSharesRequest,
  ExportSharesResponse,
} from "@oko-wallet/oko-types/user";
import type { Result } from "@oko-wallet/stdlib-js";
import { decryptDataAsync } from "@oko-wallet/crypto-js/node";
import {
  ErrorResponseSchema,
  UserAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  ExportSharesRequestSchema,
  ExportSharesSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/tss";
import { registry } from "@oko-wallet/oko-api-openapi";
import { getUserByEmailAndAuthType } from "@oko-wallet/oko-pg-interface/oko_users";

import { validateWalletEmailAndCurveType } from "@oko-wallet-api/api/tss/utils";
import { type UserAuthenticatedRequest } from "@oko-wallet-api/middleware/auth/keplr_auth";
import { validateOAuthToken } from "@oko-wallet-api/middleware/auth/google_auth/validate";
import { GOOGLE_CLIENT_ID } from "@oko-wallet-api/middleware/auth/google_auth/client_id";
import { validateAuth0IdToken } from "@oko-wallet-api/middleware/auth/auth0_auth/validate";
import {
  AUTH0_CLIENT_ID,
  AUTH0_DOMAIN,
} from "@oko-wallet-api/middleware/auth/auth0_auth/client_id";
import { validateAccessTokenOfX } from "@oko-wallet-api/middleware/auth/x_auth/validate";
import {
  validateTelegramHash,
  type TelegramUserData,
} from "@oko-wallet-api/middleware/auth/telegram_auth/validate";
import { validateDiscordOAuthToken } from "@oko-wallet-api/middleware/auth/discord_auth/validate";

registry.registerPath({
  method: "post",
  path: "/tss/v2/export_shares",
  tags: ["TSS"],
  summary: "Export server shares for wallet export",
  description:
    "Exports the server's secp256k1 TSS share and ed25519 seed_share. Requires dual authentication: JWT (Authorization header) + OAuth re-authentication (request body).",
  security: [{ userAuth: [] }],
  request: {
    headers: UserAuthHeaderSchema,
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

/**
 * Validate OAuth id_token from request body (not from Authorization header).
 * Reuses each provider's underlying validation function and constructs
 * user_identifier with the same prefix convention as the auth middlewares.
 */
async function validateOAuthIdToken(
  authType: AuthType,
  idToken: string,
  telegramBotToken?: string,
): Promise<Result<string, string>> {
  switch (authType) {
    case "google": {
      const result = await validateOAuthToken(idToken, GOOGLE_CLIENT_ID);
      if (!result.success) {
        return { success: false, err: result.err };
      }
      if (!result.data?.sub) {
        return { success: false, err: "Can't get sub from Google token" };
      }
      return { success: true, data: `google_${result.data.sub}` };
    }
    case "auth0": {
      const result = await validateAuth0IdToken({
        idToken,
        clientId: AUTH0_CLIENT_ID,
        domain: AUTH0_DOMAIN,
      });
      if (!result.success) {
        return { success: false, err: result.err };
      }
      if (!result.data?.email) {
        return { success: false, err: "Can't get email from Auth0 token" };
      }
      return { success: true, data: result.data.email };
    }
    case "x": {
      const result = await validateAccessTokenOfX(idToken);
      if (!result.success) {
        return { success: false, err: result.err };
      }
      if (!result.data?.id) {
        return { success: false, err: "Can't get id from X token" };
      }
      return { success: true, data: `x_${result.data.id}` };
    }
    case "telegram": {
      if (!telegramBotToken) {
        return { success: false, err: "Telegram bot token not configured" };
      }
      let userData: TelegramUserData;
      try {
        userData = JSON.parse(idToken) as TelegramUserData;
      } catch {
        return { success: false, err: "Invalid Telegram token format" };
      }
      const result = validateTelegramHash(userData, telegramBotToken);
      if (!result.success) {
        return { success: false, err: result.err };
      }
      if (!result.data?.id) {
        return { success: false, err: "Can't get id from Telegram token" };
      }
      return { success: true, data: `telegram_${result.data.id}` };
    }
    case "discord": {
      const result = await validateDiscordOAuthToken(idToken);
      if (!result.success) {
        return { success: false, err: result.err };
      }
      if (!result.data?.id) {
        return { success: false, err: "Can't get id from Discord token" };
      }
      return { success: true, data: `discord_${result.data.id}` };
    }
    default:
      return { success: false, err: `Invalid auth_type: ${authType}` };
  }
}

export async function exportShares(
  req: UserAuthenticatedRequest<ExportSharesRequest>,
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

    // 3. Dual-auth: Validate OAuth re-authentication token from body
    const { auth_type, id_token } = req.body;

    const oauthResult = await validateOAuthIdToken(
      auth_type,
      id_token,
      state.telegram_bot_token,
    );
    if (!oauthResult.success) {
      res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        msg: `OAuth validation failed: ${oauthResult.err}`,
      });
      return;
    }

    // 4. Same-user verification: OAuth identity must match JWT-authenticated wallets
    const oauthUserIdentifier = oauthResult.data;
    const oauthUserRes = await getUserByEmailAndAuthType(
      state.db,
      oauthUserIdentifier,
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

    // 5. Decrypt secp256k1 enc_tss_share (raw string, not JSON)
    const secp256k1EncryptedShare =
      secp256k1Wallet.enc_tss_share.toString("utf-8");
    const secp256k1Share = await decryptDataAsync(
      secp256k1EncryptedShare,
      state.encryption_secret,
    );

    // 6. Decrypt ed25519 enc_tss_share (JSON with signing_share, verifying_share, seed_share)
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
