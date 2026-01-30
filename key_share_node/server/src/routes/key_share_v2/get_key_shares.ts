import { type Response } from "express";
import type {
  GetKeyShareV2Request,
  GetKeyShareV2RequestBody,
  GetKeyShareV2Response,
} from "@oko-wallet/ksn-interface/key_share";
import { Bytes } from "@oko-wallet/bytes";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";

import { getKeyShareV2 } from "@oko-wallet-ksn-server/api/key_share";
import { type AuthenticatedRequest } from "@oko-wallet-ksn-server/middlewares";
import { ErrorCodeMap } from "@oko-wallet-ksn-server/error";
import type { ResponseLocal } from "@oko-wallet-ksn-server/routes/io";
import { registry } from "@oko-wallet-ksn-server/openapi/doc";
import {
  GetKeyShareV2RequestBodySchema,
  GetKeyShareV2SuccessResponseSchema,
  ErrorResponseSchema,
} from "@oko-wallet-ksn-server/openapi/schema";

registry.registerPath({
  method: "post",
  path: "/keyshare/v2",
  tags: ["Key Share v2", "Commit-Reveal"],
  summary: "Get multiple key shares",
  description:
    "Retrieve multiple key shares for the authenticated user in a single request. Requires commit-reveal authentication.",
  security: [{ oauthAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: GetKeyShareV2RequestBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully retrieved key shares",
      content: {
        "application/json": {
          schema: GetKeyShareV2SuccessResponseSchema,
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
                msg: 'API "get_key_shares" has already been called for this session',
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

export async function getKeysharesV2(
  req: AuthenticatedRequest<GetKeyShareV2RequestBody>,
  res: Response<KSNodeApiResponse<GetKeyShareV2Response>, ResponseLocal>,
) {
  const oauthUser = res.locals.oauth_user;
  const auth_type = oauthUser.type;
  const state = req.app.locals;
  const body = req.body;

  // Validate and convert wallets object
  const validatedWallets: GetKeyShareV2Request["wallets"] = {};

  // Validate secp256k1
  if (body.wallets.secp256k1) {
    const publicKeyBytesRes = Bytes.fromHexString(body.wallets.secp256k1, 33);
    if (publicKeyBytesRes.success === false) {
      return res.status(400).json({
        success: false,
        code: "PUBLIC_KEY_INVALID",
        msg: `Public key is not valid for secp256k1: ${publicKeyBytesRes.err}`,
      });
    }
    validatedWallets.secp256k1 = publicKeyBytesRes.data;
  }

  // Validate ed25519
  if (body.wallets.ed25519) {
    const publicKeyBytesRes = Bytes.fromHexString(body.wallets.ed25519, 32);
    if (publicKeyBytesRes.success === false) {
      return res.status(400).json({
        success: false,
        code: "PUBLIC_KEY_INVALID",
        msg: `Public key is not valid for ed25519: ${publicKeyBytesRes.err}`,
      });
    }
    validatedWallets.ed25519 = publicKeyBytesRes.data;
  }

  const result = await getKeyShareV2(
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
    data: result.data,
  });
}
