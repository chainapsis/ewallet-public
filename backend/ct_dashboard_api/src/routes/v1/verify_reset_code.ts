import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  VerifyResetCodeRequestSchema,
  VerifyResetCodeSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import { markCodeVerified } from "@oko-wallet/oko-pg-interface/email_verifications";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Request, Response } from "express";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/auth/verify-reset-code",
  tags: ["Customer Dashboard"],
  summary: "Verify reset code",
  description: "Verifies the password reset code without consuming it",
  security: [],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: VerifyResetCodeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Code verified successfully",
      content: {
        "application/json": {
          schema: VerifyResetCodeSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid code",
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

export async function verifyResetCode(
  req: Request,
  res: Response<OkoApiResponse<{ isValid: boolean }>>,
) {
  try {
    const state = req.app.locals;
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: "Email and code are required",
      });
      return;
    }

    const result = await markCodeVerified(state.db, email, code, 5);
    if (!result.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_VERIFICATION_CODE",
        msg: "Invalid or expired verification code",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { isValid: true },
    });
  } catch (error) {
    console.error("Verify reset code error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
  }
}
