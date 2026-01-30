import type { Response } from "express";
import type { KeygenEd25519Body } from "@oko-wallet/oko-types/tss";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { SignInResponseV2 } from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import {
  ErrorResponseSchema,
  OAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import { SignInSuccessResponseV2Schema } from "@oko-wallet/oko-api-openapi/tss";
import { registry } from "@oko-wallet/oko-api-openapi";
import { KeygenEd25519RequestSchema } from "@oko-wallet/oko-api-openapi/tss";

import { runKeygenEd25519 } from "@oko-wallet-api/api/tss/v2/keygen";
import { type OAuthAuthenticatedRequest } from "@oko-wallet-api/middleware/auth/oauth";
import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";

registry.registerPath({
  method: "post",
  path: "/tss/v2/keygen_ed25519",
  tags: ["TSS"],
  summary: "Run keygen to generate Ed25519 TSS key pair",
  description: "Creates Ed25519 wallet for existing user with secp256k1 wallet",
  security: [{ oauthAuth: [] }],
  request: {
    headers: OAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: KeygenEd25519RequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully created Ed25519 wallet",
      content: {
        "application/json": {
          schema: SignInSuccessResponseV2Schema,
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
    404: {
      description: "Not Found - User not found or secp256k1 wallet not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description:
        "Conflict - Ed25519 wallet already exists or public key already in use",
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

export async function keygenEd25519(
  req: OAuthAuthenticatedRequest<KeygenEd25519Body>,
  res: Response<OkoApiResponse<SignInResponseV2>, OAuthLocals>,
) {
  const state = req.app.locals;
  const oauthUser = res.locals.oauth_user;
  const auth_type = oauthUser.type as AuthType;
  const body = req.body;

  const user_identifier = oauthUser.user_identifier;

  if (!user_identifier) {
    res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "User identifier not found",
    });
    return;
  }

  const jwtConfig = {
    secret: state.jwt_secret,
    expires_in: state.jwt_expires_in,
  };

  const runKeygenRes = await runKeygenEd25519(
    state.db,
    jwtConfig,
    {
      auth_type,
      user_identifier,
      keygen_2: body.keygen_2,
      email: oauthUser.email,
      name: oauthUser.name,
      metadata: oauthUser.metadata,
    },
    state.encryption_secret,
    state.logger,
  );

  if (runKeygenRes.success === false) {
    res.status(ErrorCodeMap[runKeygenRes.code] ?? 500).json(runKeygenRes);
    return;
  }

  res.status(200).json({
    success: true,
    data: runKeygenRes.data,
  });
  return;
}
