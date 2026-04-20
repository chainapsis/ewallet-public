import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  OAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  KeygenRequestV2Schema,
  SignInSuccessResponseV2Schema,
} from "@oko-wallet/oko-api-openapi/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
// Service shutdown: signups blocked. Imports below are unused while the handler body is commented out. Re-enable together if restoring.
// import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { KeygenBodyV2 } from "@oko-wallet/oko-types/tss";
import type { SignInResponseV2 } from "@oko-wallet/oko-types/user";
import type { Response } from "express";

// import { runKeygenV2 } from "@oko-wallet-api/api/tss/v2/keygen";
import type { OAuthAuthenticatedRequest } from "@oko-wallet-api/middleware/auth/oauth";
import type { OAuthLocalsWithAPIKey } from "@oko-wallet-api/middleware/auth/types";

registry.registerPath({
  method: "post",
  path: "/tss/v2/keygen",
  tags: ["TSS"],
  summary: "Run keygen to generate TSS key pairs for both curve types",
  description:
    "Creates user and wallet entities for both secp256k1 and ed25519 curve types \
    by mapping the received key shares with the user's identifier",
  security: [{ oauthAuth: [] }],
  request: {
    headers: OAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: KeygenRequestV2Schema,
        },
      },
    },
  },
  responses: {
    200: {
      description:
        "Successfully created user and wallet entities for both curve types",
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
    409: {
      description:
        "Conflict - Email already exists or public key already in use",
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

export async function keygenV2(
  _req: OAuthAuthenticatedRequest<KeygenBodyV2>,
  res: Response<OkoApiResponse<SignInResponseV2>, OAuthLocalsWithAPIKey>,
) {
  // Service shutdown: signups permanently blocked. To restore, remove this response block and uncomment the block below.
  res.status(ErrorCodeMap.SIGNUP_DISABLED).json({
    success: false,
    code: "SIGNUP_DISABLED",
    msg: "New signups are disabled as the service is winding down.",
  });
  return;

  /* === Disabled due to service shutdown. Uncomment to restore. ===
  const state = _req.app.locals;
  const oauthUser = res.locals.oauth_user;
  const auth_type = oauthUser.type as AuthType;
  const user_identifier = oauthUser.user_identifier;
  const body = _req.body;
  const apiKey = res.locals.api_key;

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

  const runKeygenRes = await runKeygenV2(
    state.db,
    jwtConfig,
    {
      auth_type,
      user_identifier,
      keygen_2_secp256k1: body.keygen_2_secp256k1,
      keygen_2_ed25519: body.keygen_2_ed25519,
      ed25519_seed_share: body.ed25519_seed_share,
      email: oauthUser.email,
      name: oauthUser.name,
      metadata: oauthUser.metadata,
    },
    state.encryption_secret,
    state.logger,
    apiKey.customer_id,
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
  */
}
