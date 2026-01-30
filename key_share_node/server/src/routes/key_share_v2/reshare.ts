import { type Response } from "express";
import type {
  ReshareKeyShareV2Request,
  ReshareKeyShareV2RequestBody,
} from "@oko-wallet/ksn-interface/key_share";
import { Bytes } from "@oko-wallet/bytes";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";

import { reshareKeyShareV2 } from "@oko-wallet-ksn-server/api/key_share";
import { type AuthenticatedRequest } from "@oko-wallet-ksn-server/middlewares";
import { ErrorCodeMap } from "@oko-wallet-ksn-server/error";
import type { ResponseLocal } from "@oko-wallet-ksn-server/routes/io";
import { registry } from "@oko-wallet-ksn-server/openapi/doc";
import {
  ReshareKeyShareV2RequestBodySchema,
  ReshareKeyShareV2SuccessResponseSchema,
  ErrorResponseSchema,
} from "@oko-wallet-ksn-server/openapi/schema";

// --- POST /reshare ---
registry.registerPath({
  method: "post",
  path: "/keyshare/v2/reshare",
  tags: ["Key Share v2", "Commit-Reveal"],
  summary: "Reshare multiple key shares",
  description:
    "Validate and update reshared_at timestamp for multiple key shares. Validates that provided shares match existing shares. Requires commit-reveal authentication.",
  security: [{ oauthAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: ReshareKeyShareV2RequestBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully reshared key shares",
      content: {
        "application/json": {
          schema: ReshareKeyShareV2SuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          examples: {
            PUBLIC_KEY_INVALID: {
              value: {
                success: false,
                code: "PUBLIC_KEY_INVALID",
                msg: "Public key is not valid",
              },
            },
            SHARE_INVALID: {
              value: {
                success: false,
                code: "SHARE_INVALID",
                msg: "Share is not valid",
              },
            },
            INVALID_REQUEST: {
              value: {
                success: false,
                code: "INVALID_REQUEST",
                msg: "cr_session_id and cr_signature are required",
              },
            },
            INVALID_SIGNATURE: {
              value: {
                success: false,
                code: "INVALID_SIGNATURE",
                msg: "Invalid signature",
              },
            },
          },
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or missing bearer token",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Not found - User, wallet, key share or session not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          examples: {
            USER_NOT_FOUND: {
              value: {
                success: false,
                code: "USER_NOT_FOUND",
                msg: "User not found",
              },
            },
            WALLET_NOT_FOUND: {
              value: {
                success: false,
                code: "WALLET_NOT_FOUND",
                msg: "Wallet not found for curve_type: secp256k1",
              },
            },
            KEY_SHARE_NOT_FOUND: {
              value: {
                success: false,
                code: "KEY_SHARE_NOT_FOUND",
                msg: "Key share not found for curve_type: ed25519",
              },
            },
            SESSION_NOT_FOUND: {
              value: {
                success: false,
                code: "SESSION_NOT_FOUND",
                msg: "Session not found",
              },
            },
          },
        },
      },
    },
    409: {
      description: "Conflict - API already called for this session",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          examples: {
            API_ALREADY_CALLED: {
              value: {
                success: false,
                code: "API_ALREADY_CALLED",
                msg: 'API "reshare" has already been called for this session',
              },
            },
          },
        },
      },
    },
    410: {
      description: "Gone - Session has expired",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          examples: {
            SESSION_EXPIRED: {
              value: {
                success: false,
                code: "SESSION_EXPIRED",
                msg: "Session has expired",
              },
            },
          },
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          examples: {
            RESHARE_FAILED: {
              value: {
                success: false,
                code: "RESHARE_FAILED",
                msg: "Share mismatch",
              },
            },
          },
        },
      },
    },
  },
});

export async function keyshareV2Reshare(
  req: AuthenticatedRequest<ReshareKeyShareV2RequestBody>,
  res: Response<KSNodeApiResponse<void>, ResponseLocal>,
) {
  const oauthUser = res.locals.oauth_user;
  const auth_type = oauthUser.type;
  const state = req.app.locals;
  const body = req.body;

  // Validate and convert wallets object
  const validatedWallets: ReshareKeyShareV2Request["wallets"] = {};

  // Validate secp256k1
  if (body.wallets.secp256k1) {
    const publicKeyBytesRes = Bytes.fromHexString(
      body.wallets.secp256k1.public_key,
      33,
    );
    if (publicKeyBytesRes.success === false) {
      return res.status(400).json({
        success: false,
        code: "PUBLIC_KEY_INVALID",
        msg: `Public key is not valid for secp256k1: ${publicKeyBytesRes.err}`,
      });
    }
    const shareBytesRes = Bytes.fromHexString(body.wallets.secp256k1.share, 64);
    if (shareBytesRes.success === false) {
      return res.status(400).json({
        success: false,
        code: "SHARE_INVALID",
        msg: `Share is not valid for secp256k1: ${shareBytesRes.err}`,
      });
    }
    validatedWallets.secp256k1 = {
      public_key: publicKeyBytesRes.data,
      share: shareBytesRes.data,
    };
  }

  // Validate ed25519
  if (body.wallets.ed25519) {
    const publicKeyBytesRes = Bytes.fromHexString(
      body.wallets.ed25519.public_key,
      32,
    );
    if (publicKeyBytesRes.success === false) {
      return res.status(400).json({
        success: false,
        code: "PUBLIC_KEY_INVALID",
        msg: `Public key is not valid for ed25519: ${publicKeyBytesRes.err}`,
      });
    }
    const shareBytesRes = Bytes.fromHexString(body.wallets.ed25519.share, 64);
    if (shareBytesRes.success === false) {
      return res.status(400).json({
        success: false,
        code: "SHARE_INVALID",
        msg: `Share is not valid for ed25519: ${shareBytesRes.err}`,
      });
    }
    validatedWallets.ed25519 = {
      public_key: publicKeyBytesRes.data,
      share: shareBytesRes.data,
    };
  }

  const result = await reshareKeyShareV2(
    state.db,
    {
      user_auth_id: oauthUser.user_identifier,
      auth_type,
      wallets: validatedWallets,
    },
    state.encryptionSecret,
  );

  if (result.success === false) {
    return res.status(ErrorCodeMap[result.code]).json({
      success: false,
      code: result.code,
      msg: result.msg,
    });
  }

  return res.status(200).json({
    success: true,
    data: void 0,
  });
}
