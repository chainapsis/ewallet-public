import { comparePassword } from "@oko-wallet/crypto-js";
import {
  getCTDUserWithCustomerAndPasswordHashByEmail,
  getCTDUserWithCustomerByEmail,
  verifyCustomerDashboardUserEmail,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import { verifyEmailCodeFromPending } from "@oko-wallet/oko-pg-interface/email_verifications";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  LoginResponse,
  SignInRequest,
  VerifyAndLoginRequest,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Pool } from "pg";

import { generateCustomerToken } from "@oko-wallet-ctd-api/auth";
import { EMAIL_REGEX, SIX_DIGITS_REGEX } from "@oko-wallet-ctd-api/constants";
import { sendEmailVerificationCode } from "@oko-wallet-ctd-api/email/send";

interface JwtConfig {
  secret: string;
  expires_in: string;
}

interface EmailConfig {
  email_verification_expiration_minutes: number;
  from_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
}

export async function signInCustomer(
  db: Pool,
  body: SignInRequest,
  jwtConfig: JwtConfig,
  emailConfig: EmailConfig,
): Promise<OkoApiResponse<LoginResponse>> {
  try {
    if (!body.email || !body.password) {
      return {
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "email and password are required",
      };
    }

    if (!EMAIL_REGEX.test(body.email)) {
      return {
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "Invalid email format",
      };
    }

    const customerAccountResult =
      await getCTDUserWithCustomerAndPasswordHashByEmail(db, body.email);
    if (!customerAccountResult.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get customer account: ${customerAccountResult.err}`,
      };
    }
    const customerAccount = customerAccountResult.data;

    if (customerAccount === null) {
      return {
        success: false,
        code: "CUSTOMER_ACCOUNT_NOT_FOUND",
        msg: "Account not found",
      };
    }

    const isPasswordValid = await comparePassword(
      body.password,
      customerAccount.user.password_hash,
    );
    if (!isPasswordValid) {
      return {
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "Invalid email or password",
      };
    }

    if (customerAccount.user.is_email_verified === false) {
      // Fire-and-forget: send verification email
      sendEmailVerificationCode(db, {
        email: body.email,
        email_verification_expiration_minutes:
          emailConfig.email_verification_expiration_minutes,
        from_email: emailConfig.from_email,
        smtp_config: {
          smtp_host: emailConfig.smtp_host,
          smtp_port: emailConfig.smtp_port,
          smtp_user: emailConfig.smtp_user,
          smtp_pass: emailConfig.smtp_pass,
        },
      });

      return {
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        msg: "Email not verified. Please verify your email first.",
      };
    }

    const tokenResult = generateCustomerToken({
      user_id: customerAccount.user.user_id,
      jwt_config: jwtConfig,
    });

    if (!tokenResult.success) {
      return {
        success: false,
        code: "FAILED_TO_GENERATE_TOKEN",
        msg: `Failed to generate authentication token: ${tokenResult.err}`,
      };
    }

    return {
      success: true,
      data: {
        token: tokenResult.data.token,
        customer: {
          email: body.email,
          is_email_verified: customerAccount.user.is_email_verified,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `signInCustomer error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function verifyLoginCustomer(
  db: Pool,
  body: VerifyAndLoginRequest,
  jwtConfig: JwtConfig,
): Promise<OkoApiResponse<LoginResponse>> {
  try {
    if (!body.email || !body.verification_code) {
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: "email and verification_code are required",
      };
    }

    if (!SIX_DIGITS_REGEX.test(body.verification_code)) {
      return {
        success: false,
        code: "INVALID_VERIFICATION_CODE",
        msg: "Verification code must be 6 digits",
      };
    }

    const customerAccountResult = await getCTDUserWithCustomerByEmail(
      db,
      body.email,
    );
    if (!customerAccountResult.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get customer account: ${customerAccountResult.err}`,
      };
    }
    const customerAccount = customerAccountResult.data;

    if (customerAccount === null) {
      return {
        success: false,
        code: "CUSTOMER_ACCOUNT_NOT_FOUND",
        msg: "Account not found",
      };
    }

    if (customerAccount.user.is_email_verified) {
      return {
        success: false,
        code: "EMAIL_ALREADY_VERIFIED",
        msg: "Email already verified",
      };
    }

    const verificationResult = await verifyEmailCodeFromPending(db, {
      email: body.email,
      verification_code: body.verification_code,
    });

    if (!verificationResult.success) {
      return {
        success: false,
        code: "INVALID_VERIFICATION_CODE",
        msg: `Invalid or expired verification code: ${verificationResult.err}`,
      };
    }

    const verifyCustomerAccountEmailResult =
      await verifyCustomerDashboardUserEmail(db, {
        user_id: customerAccount.user.user_id,
      });

    if (!verifyCustomerAccountEmailResult.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to verify email: ${verifyCustomerAccountEmailResult.err}`,
      };
    }

    const tokenResult = generateCustomerToken({
      user_id: customerAccount.user.user_id,
      jwt_config: jwtConfig,
    });

    if (!tokenResult.success) {
      return {
        success: false,
        code: "FAILED_TO_GENERATE_TOKEN",
        msg: `Failed to generate authentication token: ${tokenResult.err}`,
      };
    }

    return {
      success: true,
      data: {
        token: tokenResult.data.token,
        customer: {
          email: body.email,
          is_email_verified:
            verifyCustomerAccountEmailResult.data.is_email_verified,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `verifyLoginCustomer error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
