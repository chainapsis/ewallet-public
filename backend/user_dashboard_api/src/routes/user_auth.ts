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
import type { Response, Router } from "express";

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

export function setUserAuthRoutes(router: Router) {
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
  router.post(
    "/customer/auth/send-code",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
    async (req, res: Response<OkoApiResponse<SendVerificationResponse>>) => {
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
    },
  );

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
  router.post(
    "/customer/auth/verify-login",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
    async (req, res: Response<OkoApiResponse<LoginResponse>>) => {
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

        // Verify the code first
        const verificationResult = await verifyEmailCode(state.db, {
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
    },
  );

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
  router.post(
    "/customer/auth/signin",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
    async (req, res: Response<OkoApiResponse<LoginResponse>>) => {
      try {
        const state = req.app.locals as any;
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
    },
  );

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
  router.post(
    "/customer/auth/change-password",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
    customerJwtMiddleware,
    async (
      req: CustomerAuthenticatedRequest<ChangePasswordRequest>,
      res: Response<OkoApiResponse<ChangePasswordResponse>>,
    ) => {
      try {
        const state = req.app.locals as any;
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
        const updateResult = await updateCustomerDashboardUserPassword(
          state.db,
          {
            user_id: customerAccount.user.user_id,
            password_hash: hashedNewPassword,
          },
        );

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
    },
  );
}
