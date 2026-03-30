import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  ResetPasswordConfirmRequestSchema,
  ResetPasswordConfirmSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Request, Response } from "express";

import { resetPasswordConfirmRequest } from "@oko-wallet-ctd-api/api/customer_password";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/auth/reset-password-confirm",
  tags: ["Customer Dashboard"],
  summary: "Confirm password reset",
  description: "Resets the password using a valid verification code",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: ResetPasswordConfirmRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password reset successfully",
      content: {
        "application/json": {
          schema: ResetPasswordConfirmSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request or code",
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

export async function resetPasswordConfirm(
  req: Request,
  res: Response<OkoApiResponse<{ message: string }>>,
) {
  const state = req.app.locals;

  const result = await resetPasswordConfirmRequest(state.db, req.body);

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
