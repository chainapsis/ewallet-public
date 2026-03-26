import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  LoginSuccessResponseSchema,
  VerifyAndLoginRequestSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { LoginResponse } from "@oko-wallet/oko-types/ct_dashboard";
import type { Request, Response } from "express";

import { verifyEmailAndLoginRequest } from "@oko-wallet-usrd-api/api/customer_auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/auth/verify-login",
  tags: ["Customer Dashboard"],
  summary: "Verify email and login",
  description:
    "Verifies the email with provided code and logs in the customer dashboard user",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: VerifyAndLoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully verified and logged in",
      content: {
        "application/json": {
          schema: LoginSuccessResponseSchema,
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
    404: {
      description: "Account not found",
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

export async function verifyEmailAndLogin(
  req: Request,
  res: Response<OkoApiResponse<LoginResponse>>,
) {
  const state = req.app.locals;

  const result = await verifyEmailAndLoginRequest(state.db, req.body, {
    secret: state.jwt_secret,
    expires_in: state.jwt_expires_in,
  });

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
