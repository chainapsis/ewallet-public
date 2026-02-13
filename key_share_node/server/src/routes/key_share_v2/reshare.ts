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
    "Upsert key shares for multiple wallets. For existing wallets: validates that provided share matches existing share, then updates reshared_at. For non-existent wallets: registers new wallet with provided share. If user doesn't exist on this node, creates the user. Requires commit-reveal authentication.",
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
      description:
        "Not found - Session not found or key share not found for existing wallet",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          examples: {
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

  // Both wallets are required
  if (!body.wallets.secp256k1 || !body.wallets.ed25519) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: "Both secp256k1 and ed25519 wallets are required",
    });
  }

  // Validate secp256k1
  const secp256k1PublicKeyRes = Bytes.fromHexString(
    body.wallets.secp256k1.public_key,
    33,
  );
  if (!secp256k1PublicKeyRes.success) {
    return res.status(400).json({
      success: false,
      code: "PUBLIC_KEY_INVALID",
      msg: `Public key is not valid for secp256k1: ${secp256k1PublicKeyRes.err}`,
    });
  }
  const secp256k1ShareRes = Bytes.fromHexString(
    body.wallets.secp256k1.share,
    64,
  );
  if (!secp256k1ShareRes.success) {
    return res.status(400).json({
      success: false,
      code: "SHARE_INVALID",
      msg: `Share is not valid for secp256k1: ${secp256k1ShareRes.err}`,
    });
  }

  // Validate ed25519
  const ed25519PublicKeyRes = Bytes.fromHexString(
    body.wallets.ed25519.public_key,
    32,
  );
  if (!ed25519PublicKeyRes.success) {
    return res.status(400).json({
      success: false,
      code: "PUBLIC_KEY_INVALID",
      msg: `Public key is not valid for ed25519: ${ed25519PublicKeyRes.err}`,
    });
  }
  const ed25519ShareRes = Bytes.fromHexString(body.wallets.ed25519.share, 64);
  if (!ed25519ShareRes.success) {
    return res.status(400).json({
      success: false,
      code: "SHARE_INVALID",
      msg: `Share is not valid for ed25519: ${ed25519ShareRes.err}`,
    });
  }

  const validatedWallets: ReshareKeyShareV2Request["wallets"] = {
    secp256k1: {
      public_key: secp256k1PublicKeyRes.data,
      share: secp256k1ShareRes.data,
    },
    ed25519: {
      public_key: ed25519PublicKeyRes.data,
      share: ed25519ShareRes.data,
      seed_share: body.wallets.ed25519.seed_share,
    },
  };

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
