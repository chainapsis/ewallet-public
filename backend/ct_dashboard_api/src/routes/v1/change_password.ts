import { comparePassword, hashPassword } from "@oko-wallet/crypto-js";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  ChangePasswordRequestSchema,
  ChangePasswordSuccessResponseSchema,
  CustomerAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import {
  getCTDUserWithCustomerAndPasswordHashByEmail,
  updateCustomerDashboardUserPassword,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Response } from "express";

import {
  CHANGED_PASSWORD_MAX_LENGTH,
  CHANGED_PASSWORD_MIN_LENGTH,
  PASSWORD_CONTAINS_NUMBER_REGEX,
} from "@oko-wallet-ctd-api/constants";
import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/auth/change-password",
  tags: ["Customer Dashboard"],
  summary: "Change customer password",
  description: "Changes the password for a customer account",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: ChangePasswordRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password changed successfully",
      content: {
        "application/json": {
          schema: ChangePasswordSuccessResponseSchema,
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
    403: {
      description: "Forbidden or original password incorrect",
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

export async function changePassword(
  req: CustomerAuthenticatedRequest<ChangePasswordRequest>,
  res: Response<OkoApiResponse<ChangePasswordResponse>>,
) {
  try {
    const state = req.app.locals;
    const request: ChangePasswordRequest = req.body;
    const userId = res.locals.user_id;

    if (!request.email || !request.new_password) {
      res.status(400).json({
        success: false,
        code: "CUSTOMER_ACCOUNT_NOT_FOUND",
        msg: "email and new_password are required",
      });
      return;
    }

    // Password strength validation
    if (request.new_password.length < CHANGED_PASSWORD_MIN_LENGTH) {
      res.status(400).json({
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "Password must be at least 8 characters long",
      });
      return;
    }

    if (request.new_password.length > CHANGED_PASSWORD_MAX_LENGTH) {
      res.status(400).json({
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "Password must be at most 16 characters long",
      });
      return;
    }

    if (!PASSWORD_CONTAINS_NUMBER_REGEX.test(request.new_password)) {
      res.status(400).json({
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "Password must include at least one number",
      });
      return;
    }

    // Inline changePassword logic
    const customerAccountResult =
      await getCTDUserWithCustomerAndPasswordHashByEmail(
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

    if (customerAccount.user.user_id !== userId) {
      res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        msg: "Forbidden",
      });
      return;
    }

    if (!customerAccount.user.is_email_verified) {
      res.status(400).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        msg: "Email not verified. Please verify your email first.",
      });
      return;
    }

    // If original password is provided, verify it
    if (request.original_password) {
      const isOriginalPasswordValid = await comparePassword(
        request.original_password,
        customerAccount.user.password_hash,
      );
      if (!isOriginalPasswordValid) {
        res.status(403).json({
          success: false,
          code: "ORIGINAL_PASSWORD_INCORRECT",
          msg: "Original password is incorrect",
        });
        return;
      }
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(request.new_password);

    // Update password
    const updateResult = await updateCustomerDashboardUserPassword(state.db, {
      user_id: customerAccount.user.user_id,
      password_hash: hashedNewPassword,
    });

    if (!updateResult.success) {
      res.status(500).json({
        success: false,
        code: "FAILED_TO_UPDATE_PASSWORD",
        msg: `Failed to update password: ${updateResult.err}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        message: "Password changed successfully",
      },
    });
    return;
  } catch (error) {
    console.error("Change password route error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
    return;
  }
}
