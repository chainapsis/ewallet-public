import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  LoginSuccessResponseSchema,
  SignInRequestSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { LoginResponse } from "@oko-wallet/oko-types/ct_dashboard";
import type { Request, Response } from "express";

import { signInCustomer } from "@oko-wallet-ctd-api/api/customer_auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/auth/signin",
  tags: ["Customer Dashboard"],
  summary: "Sign in customer",
  description: "Authenticates a customer using email and password",
  security: [],
  request: {
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
    401: {
      description: "Invalid email or password",
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

export async function signIn(
  req: Request,
  res: Response<OkoApiResponse<LoginResponse>>,
) {
  const state = req.app.locals;

  const result = await signInCustomer(
    state.db,
    req.body,
    { secret: state.jwt_secret, expires_in: state.jwt_expires_in },
    {
      email_verification_expiration_minutes:
        state.email_verification_expiration_minutes,
      from_email: state.from_email,
      smtp_host: state.smtp_host,
      smtp_port: state.smtp_port,
      smtp_user: state.smtp_user,
      smtp_pass: state.smtp_pass,
    },
  );

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
