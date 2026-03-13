import { z } from "zod";

import { registry } from "../registry";

export const CustomerAuthHeaderSchema = z.object({
  Authorization: z
    .string()
    .regex(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/)
    .openapi({
      description: "Customer dashboard bearer token",
      example: "Bearer eyJhbGciOiJIUzI1NiIs...",
      param: {
        name: "Authorization",
        in: "header",
        required: true,
      },
    }),
});

export const SendVerificationRequestSchema = registry.register(
  "CustomerDashboardSendVerificationRequest",
  z.object({
    email: z.email().openapi({
      description: "Email address to send verification code",
    }),
  }),
);

const SendVerificationResponseSchema = registry.register(
  "CustomerDashboardSendVerificationResponse",
  z.object({
    message: z.string().openapi({
      description: "Success message indicating verification code was sent",
    }),
    expires_at: z.string().openapi({
      description: "ISO 8601 expiration timestamp of the verification code",
    }),
  }),
);

export const SendVerificationSuccessResponseSchema = registry.register(
  "CustomerDashboardSendVerificationSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: SendVerificationResponseSchema,
  }),
);

export const VerifyAndLoginRequestSchema = registry.register(
  "CustomerDashboardVerifyAndLoginRequest",
  z.object({
    email: z.email().openapi({
      description: "Email address to verify",
    }),
    verification_code: z.string().openapi({
      description: "Verification code received via email",
    }),
  }),
);

export const SignInRequestSchema = registry.register(
  "CustomerDashboardSignInRequest",
  z.object({
    email: z.email().openapi({
      description: "Email address for sign in",
    }),
    password: z.string().min(4).openapi({
      description: "Password for sign in",
    }),
  }),
);

const LoginCustomerSchema = registry.register(
  "CustomerDashboardLoginCustomer",
  z.object({
    email: z.email().openapi({
      description: "Customer email address",
    }),
    is_email_verified: z.boolean().openapi({
      description: "Whether the email has been verified",
    }),
  }),
);

const LoginResponseSchema = registry.register(
  "CustomerDashboardLoginResponse",
  z.object({
    token: z.string().openapi({
      description: "JWT token for authentication",
    }),
    customer: LoginCustomerSchema.openapi({
      description: "Customer information",
    }),
  }),
);

export const LoginSuccessResponseSchema = registry.register(
  "CustomerDashboardLoginSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: LoginResponseSchema,
  }),
);

export const ChangePasswordRequestSchema = registry.register(
  "CustomerDashboardChangePasswordRequest",
  z.object({
    email: z.email().openapi({
      description: "Email address of the account",
    }),
    new_password: z
      .string()
      .min(8)
      .max(16)
      .regex(/\d/, "Password must include at least one number")
      .openapi({
        description:
          "New password to set (8-16 characters, must include at least one number)",
      }),
    original_password: z.string().optional().openapi({
      description: "Current password for verification",
    }),
  }),
);

const ChangePasswordResponseSchema = registry.register(
  "CustomerDashboardChangePasswordResponse",
  z.object({
    message: z.string().openapi({
      description: "Success message indicating password was changed",
    }),
  }),
);

export const ChangePasswordSuccessResponseSchema = registry.register(
  "CustomerDashboardChangePasswordSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: ChangePasswordResponseSchema,
  }),
);

export const ForgotPasswordRequestSchema = registry.register(
  "CustomerDashboardForgotPasswordRequest",
  z.object({
    email: z.email().openapi({
      description: "Email address to send password reset code",
    }),
  }),
);

const ForgotPasswordResponseSchema = registry.register(
  "CustomerDashboardForgotPasswordResponse",
  z.object({
    message: z.string().openapi({
      description: "Success message indicating reset code was sent",
    }),
    expires_at: z.string().openapi({
      description: "ISO 8601 expiration timestamp of the reset code",
    }),
  }),
);

export const ForgotPasswordSuccessResponseSchema = registry.register(
  "CustomerDashboardForgotPasswordSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: ForgotPasswordResponseSchema,
  }),
);

export const VerifyResetCodeRequestSchema = registry.register(
  "CustomerDashboardVerifyResetCodeRequest",
  z.object({
    email: z.email().openapi({
      description: "Email address associated with the reset code",
    }),
    code: z.string().length(6).openapi({
      description: "The 6-digit verification code",
    }),
  }),
);

const VerifyResetCodeResponseSchema = registry.register(
  "CustomerDashboardVerifyResetCodeResponse",
  z.object({
    isValid: z.boolean().openapi({
      description: "Whether the code is valid",
    }),
  }),
);

export const VerifyResetCodeSuccessResponseSchema = registry.register(
  "CustomerDashboardVerifyResetCodeSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: VerifyResetCodeResponseSchema,
  }),
);

export const ResetPasswordConfirmRequestSchema = registry.register(
  "CustomerDashboardResetPasswordConfirmRequest",
  z.object({
    email: z.email().openapi({
      description: "Email address to reset password for",
    }),
    code: z.string().length(6).openapi({
      description: "The 6-digit verification code",
    }),
    newPassword: z
      .string()
      .min(8)
      .max(16)
      .regex(/\d/, "Password must include at least one number")
      .openapi({
        description:
          "The new password (8-16 characters, must include at least one number)",
      }),
  }),
);

const ResetPasswordConfirmResponseSchema = registry.register(
  "CustomerDashboardResetPasswordConfirmResponse",
  z.object({
    message: z.string().openapi({
      description: "Success message",
    }),
  }),
);

export const ResetPasswordConfirmSuccessResponseSchema = registry.register(
  "CustomerDashboardResetPasswordConfirmSuccessResponse",
  z.object({
    success: z.literal(true).openapi({
      description: "Indicates the request succeeded",
    }),
    data: ResetPasswordConfirmResponseSchema,
  }),
);
