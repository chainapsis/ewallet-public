import { comparePassword } from "@oko-wallet/crypto-js";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  LoginSuccessResponseSchema,
  SignInRequestSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import { getCTDUserWithCustomerAndPasswordHashByEmail } from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  LoginResponse,
  SignInRequest,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Request, Response } from "express";

import { generateCustomerToken } from "@oko-wallet-ctd-api/auth";
import { EMAIL_REGEX } from "@oko-wallet-ctd-api/constants";
import { sendEmailVerificationCode } from "@oko-wallet-ctd-api/email/send";

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
  try {
    const state = req.app.locals;
    const request: SignInRequest = req.body;

    if (!request.email || !request.password) {
      res.status(400).json({
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "email and password are required",
      });
      return;
    }

    // Basic email validation
    if (!EMAIL_REGEX.test(request.email)) {
      res.status(400).json({
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "Invalid email format",
      });
      return;
    }

    // Inline signIn logic
    const customerAccountResult =
      await getCTDUserWithCustomerAndPasswordHashByEmail(
        state.db,
        request.email,
      );
    if (!customerAccountResult.success) {
      res.status(404).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get customer account: ${customerAccountResult.err}`,
      });
      return;
    }
    const customerAccount = customerAccountResult.data;

    if (customerAccount === null) {
      res.status(404).json({
        success: false,
        code: "CUSTOMER_ACCOUNT_NOT_FOUND",
        msg: "Account not found",
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      request.password,
      customerAccount.user.password_hash,
    );
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "Invalid email or password",
      });
      return;
    }

    // If email is not verified, return error
    if (customerAccount.user.is_email_verified === false) {
      sendEmailVerificationCode(state.db, {
        email: request.email,
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

      res.status(400).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        msg: "Email not verified. Please verify your email first.",
      });
      return;
    }

    // Generate JWT token
    const tokenResult = generateCustomerToken({
      user_id: customerAccount.user.user_id,
      jwt_config: {
        secret: state.jwt_secret,
        expires_in: state.jwt_expires_in,
      },
    });

    if (!tokenResult.success) {
      res.status(500).json({
        success: false,
        code: "FAILED_TO_GENERATE_TOKEN",
        msg: `Failed to generate authentication token: ${tokenResult.err}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        token: tokenResult.data.token,
        customer: {
          email: request.email,
          is_email_verified: customerAccount.user.is_email_verified,
        },
      },
    });
    return;
  } catch (error) {
    console.error("Sign in route error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
    return;
  }
}
