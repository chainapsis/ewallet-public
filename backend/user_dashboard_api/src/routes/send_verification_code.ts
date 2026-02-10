import { comparePassword, hashPassword } from "@oko-wallet/crypto-js";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  ChangePasswordRequestSchema,
  ChangePasswordSuccessResponseSchema,
  CustomerAuthHeaderSchema,
  LoginSuccessResponseSchema,
  SendVerificationRequestSchema,
  SendVerificationSuccessResponseSchema,
  SignInRequestSchema,
  VerifyAndLoginRequestSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import {
  getCTDUserWithCustomerAndPasswordHashByEmail,
  getCTDUserWithCustomerByEmail,
  updateCustomerDashboardUserPassword,
  verifyCustomerDashboardUserEmail,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import { verifyEmailCode } from "@oko-wallet/oko-pg-interface/email_verifications";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginResponse,
  SendVerificationRequest,
  SendVerificationResponse,
  SignInRequest,
  VerifyAndLoginRequest,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Request, Response, Router } from "express";

import { generateCustomerToken } from "@oko-wallet-usrd-api/auth";
import {
  CHANGED_PASSWORD_MIN_LENGTH,
  EMAIL_REGEX,
  SIX_DIGITS_REGEX,
} from "@oko-wallet-usrd-api/constants";
import { sendEmailVerificationCode } from "@oko-wallet-usrd-api/email/send";
import {
  type CustomerAuthenticatedRequest,
  customerJwtMiddleware,
} from "@oko-wallet-usrd-api/middleware/auth";
import { rateLimitMiddleware } from "@oko-wallet-usrd-api/middleware/rate_limit";

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
  try {
    const state = req.app.locals;
    const request: SendVerificationRequest = {
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
    };
    const sendEmailVerificationCodeRes = await sendEmailVerificationCode(
      state.db,
      request,
    );

    if (sendEmailVerificationCodeRes.success === false) {
      res.status(ErrorCodeMap[sendEmailVerificationCodeRes.code]).json({
        success: false,
        code: sendEmailVerificationCodeRes.code,
        msg: sendEmailVerificationCodeRes.msg,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        message: sendEmailVerificationCodeRes.data.message,
      },
    });
    return;
  } catch (error) {
    console.error("Send verification code route error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
