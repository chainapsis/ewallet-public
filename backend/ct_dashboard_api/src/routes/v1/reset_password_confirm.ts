import { hashPassword } from "@oko-wallet/crypto-js";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  ResetPasswordConfirmRequestSchema,
  ResetPasswordConfirmSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import {
  getCTDUserWithCustomerAndPasswordHashByEmail,
  updateCustomerDashboardUserPassword,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import { verifyEmailCode } from "@oko-wallet/oko-pg-interface/email_verifications";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Request, Response } from "express";

import {
  CHANGED_PASSWORD_MAX_LENGTH,
  CHANGED_PASSWORD_MIN_LENGTH,
  PASSWORD_CONTAINS_NUMBER_REGEX,
} from "@oko-wallet-ctd-api/constants";

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
  try {
    const state = req.app.locals;
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: "Missing fields",
      });
      return;
    }

    if (newPassword.length < CHANGED_PASSWORD_MIN_LENGTH) {
      res.status(400).json({
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "Password too short",
      });
      return;
    }

    if (newPassword.length > CHANGED_PASSWORD_MAX_LENGTH) {
      res.status(400).json({
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "Password too long",
      });
      return;
    }

    if (!PASSWORD_CONTAINS_NUMBER_REGEX.test(newPassword)) {
      res.status(400).json({
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "Password must include at least one number",
      });
      return;
    }

    const verificationResult = await verifyEmailCode(state.db, {
      email,
      verification_code: code,
    });

    if (!verificationResult.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_VERIFICATION_CODE",
        msg: "Invalid or expired verification code",
      });
      return;
    }

    const customerAccountResult =
      await getCTDUserWithCustomerAndPasswordHashByEmail(state.db, email);

    if (!customerAccountResult.success || !customerAccountResult.data) {
      res.status(404).json({
        success: false,
        code: "CUSTOMER_ACCOUNT_NOT_FOUND",
        msg: "User not found",
      });
      return;
    }

    const hashedNewPassword = await hashPassword(newPassword);
    const updateResult = await updateCustomerDashboardUserPassword(state.db, {
      user_id: customerAccountResult.data.user.user_id,
      password_hash: hashedNewPassword,
    });

    if (!updateResult.success) {
      res.status(500).json({
        success: false,
        code: "FAILED_TO_UPDATE_PASSWORD",
        msg: "Failed to update password",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { message: "Password reset successfully" },
    });
  } catch (error) {
    console.error("Reset password confirm error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
  }
}
