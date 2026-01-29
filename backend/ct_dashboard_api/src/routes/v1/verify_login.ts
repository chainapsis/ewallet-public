import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  LoginSuccessResponseSchema,
  VerifyAndLoginRequestSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import {
  getCTDUserWithCustomerByEmail,
  verifyCustomerDashboardUserEmail,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import { verifyEmailCodeFromPending } from "@oko-wallet/oko-pg-interface/email_verifications";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  LoginResponse,
  VerifyAndLoginRequest,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Request, Response } from "express";

import { generateCustomerToken } from "@oko-wallet-ctd-api/auth";
import { SIX_DIGITS_REGEX } from "@oko-wallet-ctd-api/constants";

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

export async function verifyLogin(
  req: Request,
  res: Response<OkoApiResponse<LoginResponse>>,
) {
  try {
    const state = req.app.locals as any;
    const request: VerifyAndLoginRequest = req.body;

    if (!request.email || !request.verification_code) {
      res.status(400).json({
        success: false,
        code: "CUSTOMER_ACCOUNT_NOT_FOUND",
        msg: "email and verification_code are required",
      });
      return;
    }

    // Validate verification code format (6 digits)
    if (!SIX_DIGITS_REGEX.test(request.verification_code)) {
      res.status(400).json({
        success: false,
        code: "INVALID_VERIFICATION_CODE",
        msg: "Verification code must be 6 digits",
      });
      return;
    }

    // Inline verifyCodeAndLogin logic
    const customerAccountResult = await getCTDUserWithCustomerByEmail(
      state.db,
      request.email,
    );
    if (!customerAccountResult.success) {
      res.status(500).json({
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

    if (customerAccount.user.is_email_verified) {
      res.status(400).json({
        success: false,
        code: "EMAIL_ALREADY_VERIFIED",
        msg: "Email already verified",
      });
      return;
    }

    // Verify the code first (from PENDING status directly to VERIFIED)
    const verificationResult = await verifyEmailCodeFromPending(state.db, {
      email: request.email,
      verification_code: request.verification_code,
    });

    if (!verificationResult.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_VERIFICATION_CODE",
        msg: `Invalid or expired verification code: ${verificationResult.err}`,
      });
      return;
    }

    const verifyCustomerAccountEmailResult =
      await verifyCustomerDashboardUserEmail(state.db, {
        user_id: customerAccount.user.user_id,
      });

    if (!verifyCustomerAccountEmailResult.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to verify email: ${verifyCustomerAccountEmailResult.err}`,
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
          is_email_verified:
            verifyCustomerAccountEmailResult.data.is_email_verified,
        },
      },
    });
    return;
  } catch (error) {
    console.error("Verify and login route error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }
}
