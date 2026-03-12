import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  SocialLoginXRequestSchema,
  SocialLoginXSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/social_login";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  SocialLoginXBody,
  SocialLoginXResponse,
} from "@oko-wallet/oko-types/social_login";
import type { Request, Response } from "express";

import { X_CLIENT_ID, X_SOCIAL_LOGIN_TOKEN_URL } from "@oko-wallet-api/api/x";

registry.registerPath({
  method: "post",
  path: "/social-login/v1/x/get-token",
  tags: ["Social Login"],
  summary: "Get X access token",
  description: "Exchange authorization code for an X access token",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: SocialLoginXRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully retrieved access token",
      content: {
        "application/json": {
          schema: SocialLoginXSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export async function getXToken(
  req: Request<any, any, SocialLoginXBody>,
  res: Response<OkoApiResponse<SocialLoginXResponse>>,
) {
  const body = req.body;

  if (!body.code || !body.code_verifier || !body.redirect_uri) {
    res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: "Code, code_verifier, or redirect_uri is not set",
    });
    return;
  }

  const reqBody = new URLSearchParams({
    code: body.code,
    grant_type: "authorization_code",
    client_id: X_CLIENT_ID,
    redirect_uri: body.redirect_uri,
    code_verifier: body.code_verifier,
  });
  const response = await fetch(X_SOCIAL_LOGIN_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: reqBody,
  });

  if (response.status === 200) {
    res.status(200).json({
      success: true,
      data: await response.json(),
    });
    return;
  }

  res.status(response.status).json({
    success: false,
    code: "UNKNOWN_ERROR",
    msg: await response.text(),
  });
}
