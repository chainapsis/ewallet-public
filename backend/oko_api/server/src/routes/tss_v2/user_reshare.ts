import type { Response } from "express";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { ReshareRequestV2 } from "@oko-wallet/oko-types/user";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import {
  ErrorResponseSchema,
  OAuthHeaderSchema,
  SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/common";
import { ReshareRequestV2Schema } from "@oko-wallet/oko-api-openapi/tss";
import { Bytes } from "@oko-wallet/bytes";
import { registry } from "@oko-wallet/oko-api-openapi";

import { updateWalletKSNodesForReshareV2 } from "@oko-wallet-api/api/tss/v2/user";
import { type OAuthAuthenticatedRequest } from "@oko-wallet-api/middleware/auth/oauth";
import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";

registry.registerPath({
  method: "post",
  path: "/tss/v2/user/reshare",
  tags: ["TSS"],
  summary: "Reshare wallet key shares",
  description:
    "Updates wallet key share nodes after reshare for both wallets",
  security: [{ oauthAuth: [] }],
  request: {
    headers: OAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: ReshareRequestV2Schema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Reshare request accepted",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request body",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or missing OAuth token",
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

export async function userReshareV2(
  req: OAuthAuthenticatedRequest<ReshareRequestV2>,
  res: Response<OkoApiResponse<void>, OAuthLocals>,
) {
  const state = req.app.locals;
  const oauthUser = res.locals.oauth_user;
  const auth_type = oauthUser.type as AuthType;
  const user_identifier = oauthUser.user_identifier;
  const { secp256k1_public_key, ed25519_public_key, reshared_key_shares } =
    req.body;

  if (!user_identifier) {
    res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "User identifier not found",
    });
    return;
  }

  const secp256k1PublicKeyRes = Bytes.fromHexString(secp256k1_public_key, 33);
  if (!secp256k1PublicKeyRes.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: `Invalid secp256k1 public key: ${secp256k1PublicKeyRes.err}`,
    });
    return;
  }

  const ed25519PublicKeyRes = Bytes.fromHexString(ed25519_public_key, 32);
  if (!ed25519PublicKeyRes.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: `Invalid ed25519 public key: ${ed25519PublicKeyRes.err}`,
    });
    return;
  }

  if (!reshared_key_shares?.length) {
    res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: "reshared_key_shares is required",
    });
    return;
  }

  const reshareRes = await updateWalletKSNodesForReshareV2(
    state.db,
    user_identifier,
    auth_type,
    {
      secp256k1PublicKey: secp256k1PublicKeyRes.data,
      ed25519PublicKey: ed25519PublicKeyRes.data,
      resharedKeyShares: reshared_key_shares,
    },
  );

  if (!reshareRes.success) {
    res.status(ErrorCodeMap[reshareRes.code] ?? 500).json(reshareRes);
    return;
  }

  res.status(200).json({
    success: true,
    data: void 0,
  });
}
