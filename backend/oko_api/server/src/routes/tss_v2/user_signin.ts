import type { Response } from "express";
import type { SignInResponseV2 } from "@oko-wallet/oko-types/user";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import {
  ErrorResponseSchema,
  OAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  SignInRequestSchema,
  SignInSuccessResponseV2Schema,
} from "@oko-wallet/oko-api-openapi/tss";
import { registry } from "@oko-wallet/oko-api-openapi";

import { signInV2 } from "@oko-wallet-api/api/tss/v2/user";
import { type OAuthAuthenticatedRequest } from "@oko-wallet-api/middleware/auth/oauth";
import type { OAuthLocals } from "@oko-wallet-api/middleware/auth/types";

registry.registerPath({
  method: "post",
  path: "/tss/v1/user/signin",
  tags: ["TSS"],
  summary: "Sign in with OAuth",
  description:
    "Authenticates user using Google or Auth0 OAuth token and returns user information with JWT token",
  security: [{ oauthAuth: [] }],
  request: {
    headers: OAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: SignInRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully signed in",
      content: {
        "application/json": {
          schema: SignInSuccessResponseV2Schema,
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or missing OAuth token or auth_type",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Not Found - User or wallet not found",
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

export async function userSignInV2(
  req: OAuthAuthenticatedRequest,
  res: Response<OkoApiResponse<SignInResponseV2>, OAuthLocals>,
) {
  const state = req.app.locals;
  const oauthUser = res.locals.oauth_user;
  const auth_type = oauthUser.type as AuthType;
  const user_identifier = oauthUser.user_identifier;

  if (!user_identifier) {
    res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "User identifier not found",
    });
    return;
  }

  const signInRes = await signInV2(
    state.db,
    user_identifier,
    auth_type,
    {
      secret: state.jwt_secret,
      expires_in: state.jwt_expires_in,
    },
    state.encryption_secret,
    state.logger,
    oauthUser.email,
    oauthUser.name,
    oauthUser.metadata,
  );
  if (signInRes.success === false) {
    res
      .status(ErrorCodeMap[signInRes.code] ?? 500) //
      .json(signInRes);
    return;
  }

  res.status(200).json({
    success: true,
    data: signInRes.data,
  });
}
