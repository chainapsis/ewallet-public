import { type Response } from "express";
import type {
  RegisterKeyShareV2Request,
  RegisterKeyShareV2RequestBody,
} from "@oko-wallet/ksn-interface/key_share";
import { Bytes } from "@oko-wallet/bytes";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";

import { registerKeyShareV2 } from "@oko-wallet-ksn-server/api/key_share";
import { type AuthenticatedRequest } from "@oko-wallet-ksn-server/middlewares";
import { ErrorCodeMap } from "@oko-wallet-ksn-server/error";
import type { ResponseLocal } from "@oko-wallet-ksn-server/routes/io";
import { registry } from "@oko-wallet-ksn-server/openapi/doc";
import {
  RegisterKeyShareV2RequestBodySchema,
  RegisterKeyShareV2SuccessResponseSchema,
  ErrorResponseSchema,
} from "@oko-wallet-ksn-server/openapi/schema";

// --- POST /register ---
registry.registerPath({
  method: "post",
  path: "/keyshare/v2/register",
  tags: ["Key Share v2", "Commit-Reveal"],
  summary: "Register key shares (both curves required)",
  description:
    "Register key shares for the authenticated user. Both secp256k1 and ed25519 wallets are required. Requires commit-reveal authentication.",
  security: [{ oauthAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: RegisterKeyShareV2RequestBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully registered key shares",
      content: {
        "application/json": {
          schema: RegisterKeyShareV2SuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          examples: {
            INVALID_REQUEST: {
              value: {
                success: false,
                code: "INVALID_REQUEST",
                msg: "Both secp256k1 and ed25519 wallets are required",
              },
            },
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
      description: "Not found - Session not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          examples: {
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
      description: "Conflict - Duplicate public key or API already called",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          examples: {
            DUPLICATE_PUBLIC_KEY: {
              value: {
                success: false,
                code: "DUPLICATE_PUBLIC_KEY",
                msg: "Duplicate public key for curve_type: secp256k1",
              },
            },
            API_ALREADY_CALLED: {
              value: {
                success: false,
                code: "API_ALREADY_CALLED",
                msg: 'API "register" has already been called for this session',
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
        },
      },
    },
  },
});

export async function keyshareV2Register(
  req: AuthenticatedRequest<RegisterKeyShareV2RequestBody>,
  res: Response<KSNodeApiResponse<void>, ResponseLocal>,
) {
  const oauthUser = res.locals.oauth_user;
  const auth_type = oauthUser.type;
  const state = req.app.locals;
  const body = req.body;

  // Validate and convert wallets object
  const validatedWallets: RegisterKeyShareV2Request["wallets"] = {};

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

  const result = await registerKeyShareV2(
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
