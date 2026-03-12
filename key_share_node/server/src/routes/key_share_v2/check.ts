import { Bytes } from "@oko-wallet/bytes";
import type {
  CheckKeyShareV2Request,
  CheckKeyShareV2RequestBody,
  CheckKeyShareV2Response,
} from "@oko-wallet/ksn-interface/key_share";
import type { KSNodeApiResponse } from "@oko-wallet/ksn-interface/response";
import type { Response } from "express";

import { checkKeyShareV2 } from "@oko-wallet-ksn-server/api/key_share";
import { ErrorCodeMap } from "@oko-wallet-ksn-server/error";
import { registry } from "@oko-wallet-ksn-server/openapi/doc";
import {
  CheckKeyShareV2RequestBodySchema,
  CheckKeyShareV2SuccessResponseSchema,
  ErrorResponseSchema,
} from "@oko-wallet-ksn-server/openapi/schema";
import type {
  KSNodeRequest,
  ResponseLocal,
} from "@oko-wallet-ksn-server/routes/io";

// --- POST /check ---
registry.registerPath({
  method: "post",
  path: "/keyshare/v2/check",
  tags: ["Key Share v2"],
  summary: "Check multiple key shares existence",
  description:
    "Check existence of multiple key shares for a user in a single request. No authentication required.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CheckKeyShareV2RequestBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully checked key shares existence",
      content: {
        "application/json": {
          schema: CheckKeyShareV2SuccessResponseSchema,
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

export async function keyshareV2Check(
  req: KSNodeRequest<CheckKeyShareV2RequestBody>,
  res: Response<KSNodeApiResponse<CheckKeyShareV2Response>, ResponseLocal>,
) {
  const state = req.app.locals;
  const body = req.body;

  // Validate and convert wallets object
  const validatedWallets: CheckKeyShareV2Request["wallets"] = {};

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

  const result = await checkKeyShareV2(state.db, {
    user_auth_id: body.user_auth_id,
    auth_type: body.auth_type,
    wallets: validatedWallets,
  });

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
