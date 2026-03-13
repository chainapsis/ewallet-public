import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  SocialLoginXVerifyUserSuccessResponseSchema,
  XAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/social_login";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { SocialLoginXVerifyUserResponse } from "@oko-wallet/oko-types/social_login";
import type { Request, Response } from "express";

import { getXUserInfo } from "@oko-wallet-api/api/x";

registry.registerPath({
  method: "get",
  path: "/social-login/v1/x/verify-user",
  tags: ["Social Login"],
  summary: "Verify X user",
  description: "Fetch X user profile using access token",
  request: {
    headers: XAuthHeaderSchema,
  },
  responses: {
    200: {
      description: "Successfully verified X user",
      content: {
        "application/json": {
          schema: SocialLoginXVerifyUserSuccessResponseSchema,
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
    401: {
      description: "Unauthorized",
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

export async function verifyXUser(
  req: Request<any, any, null>,
  res: Response<OkoApiResponse<SocialLoginXVerifyUserResponse>>,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: "Missing or invalid Authorization header",
    });
    return;
  }

  const accessToken = authHeader.replace("Bearer ", "");

  if (!accessToken) {
    res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      msg: "Access token is not set",
    });
    return;
  }

  const response = await getXUserInfo(accessToken);

  if (response.success) {
    res.status(200).json({
      success: true,
      data: response.data,
    });
    return;
  }

  res.status(response.err.status).json({
    success: false,
    code: "UNKNOWN_ERROR",
    msg: response.err.text,
  });
}
