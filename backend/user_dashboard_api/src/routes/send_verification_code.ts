import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  SendVerificationRequestSchema,
  SendVerificationSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { SendVerificationResponse } from "@oko-wallet/oko-types/ct_dashboard";
import type { Request, Response } from "express";

import { sendEmailVerificationCode } from "@oko-wallet-usrd-api/email/send";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/auth/send-code",
  tags: ["Customer Dashboard"],
  summary: "Send verification code",
  description: "Sends a verification code to the provided email address",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: SendVerificationRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Verification code sent successfully",
      content: {
        "application/json": {
          schema: SendVerificationSuccessResponseSchema,
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

export async function sendVerificationCodeRoute(
  req: Request,
  res: Response<OkoApiResponse<SendVerificationResponse>>,
) {
  const state = req.app.locals;

  const result = await sendEmailVerificationCode(state.db, {
    email: req.body.email,
    email_verification_expiration_minutes:
      state.email_verification_expiration_minutes,
    from_email: state.from_email,
    smtp_config: {
      smtp_host: state.smtp_host,
      smtp_port: state.smtp_port,
      smtp_user: state.smtp_user,
      smtp_pass: state.smtp_pass,
    },
  });

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
