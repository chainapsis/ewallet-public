import { comparePassword, hashPassword } from "@oko-wallet/crypto-js";
import {
  getCTDUserWithCustomerAndPasswordHashByEmail,
  getCTDUserWithCustomerByEmail,
  updateCustomerDashboardUserPassword,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import {
  createEmailVerification,
  verifyEmailCode,
} from "@oko-wallet/oko-pg-interface/email_verifications";
import type {
  OkoApiErrorResponse,
  OkoApiResponse,
} from "@oko-wallet/oko-types/api_response";
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Pool } from "pg";

import {
  CHANGED_PASSWORD_MAX_LENGTH,
  CHANGED_PASSWORD_MIN_LENGTH,
  EMAIL_REGEX,
  PASSWORD_CONTAINS_NUMBER_REGEX,
} from "@oko-wallet-ctd-api/constants";
import { sendPasswordResetEmail } from "@oko-wallet-ctd-api/email/password_reset";
import { generateVerificationCode } from "@oko-wallet-ctd-api/email/verification";

interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
}

function validatePassword(password: string): OkoApiErrorResponse | null {
  if (password.length < CHANGED_PASSWORD_MIN_LENGTH) {
    return {
      success: false,
      code: "INVALID_EMAIL_OR_PASSWORD",
      msg: `Password must be at least ${CHANGED_PASSWORD_MIN_LENGTH} characters long`,
    };
  }

  if (password.length > CHANGED_PASSWORD_MAX_LENGTH) {
    return {
      success: false,
      code: "INVALID_EMAIL_OR_PASSWORD",
      msg: `Password must be at most ${CHANGED_PASSWORD_MAX_LENGTH} characters long`,
    };
  }

  if (!PASSWORD_CONTAINS_NUMBER_REGEX.test(password)) {
    return {
      success: false,
      code: "INVALID_EMAIL_OR_PASSWORD",
      msg: "Password must include at least one number",
    };
  }

  return null;
}

export async function forgotPasswordRequest(
  db: Pool,
  body: { email: string },
  config: {
    email_verification_expiration_minutes: number;
    from_email: string;
    smtp_config: SmtpConfig;
  },
): Promise<OkoApiResponse<{ message: string; expires_at: string }>> {
  try {
    const { email } = body;

    if (!email) {
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: "email is required",
      };
    }

    if (!EMAIL_REGEX.test(email)) {
      return {
        success: false,
        code: "INVALID_EMAIL_OR_PASSWORD",
        msg: "Invalid email format",
      };
    }

    const customerAccountResult = await getCTDUserWithCustomerByEmail(
      db,
      email,
    );

    if (!customerAccountResult.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to check account",
      };
    }

    if (customerAccountResult.data === null) {
      return {
        success: false,
        code: "CUSTOMER_ACCOUNT_NOT_FOUND",
        msg: "Account not found",
      };
    }

    const EXPIRY_BUFFER_SECONDS = 5;
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + config.email_verification_expiration_minutes,
    );
    expiresAt.setSeconds(expiresAt.getSeconds() + EXPIRY_BUFFER_SECONDS);

    const createRes = await createEmailVerification(db, {
      email,
      verification_code: verificationCode,
      expires_at: expiresAt,
    });

    if (!createRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to create verification",
      };
    }

    const emailRes = await sendPasswordResetEmail(
      email,
      verificationCode,
      customerAccountResult.data.label,
      config.from_email,
      config.email_verification_expiration_minutes,
      config.smtp_config,
    );

    if (!emailRes.success) {
      return {
        success: false,
        code: "FAILED_TO_SEND_EMAIL",
        msg: "Failed to send email",
      };
    }

    return {
      success: true,
      data: {
        message: "Reset code sent successfully",
        expires_at: createRes.data.expires_at.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `forgotPasswordRequest error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function changeCustomerPassword(
  db: Pool,
  body: ChangePasswordRequest,
  userId: string,
): Promise<OkoApiResponse<ChangePasswordResponse>> {
  try {
    if (!body.email || !body.new_password) {
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: "email and new_password are required",
      };
    }

    const passwordError = validatePassword(body.new_password);
    if (passwordError) {
      return passwordError;
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

    if (customerAccount.user.user_id !== userId) {
      return {
        success: false,
        code: "FORBIDDEN",
        msg: "Forbidden",
      };
    }

    if (!customerAccount.user.is_email_verified) {
      return {
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        msg: "Email not verified. Please verify your email first.",
      };
    }

    if (body.original_password) {
      const isOriginalPasswordValid = await comparePassword(
        body.original_password,
        customerAccount.user.password_hash,
      );
      if (!isOriginalPasswordValid) {
        return {
          success: false,
          code: "ORIGINAL_PASSWORD_INCORRECT",
          msg: "Original password is incorrect",
        };
      }
    }

    const hashedNewPassword = await hashPassword(body.new_password);

    const updateResult = await updateCustomerDashboardUserPassword(db, {
      user_id: customerAccount.user.user_id,
      password_hash: hashedNewPassword,
    });

    if (!updateResult.success) {
      return {
        success: false,
        code: "FAILED_TO_UPDATE_PASSWORD",
        msg: `Failed to update password: ${updateResult.err}`,
      };
    }

    return {
      success: true,
      data: {
        message: "Password changed successfully",
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `changeCustomerPassword error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function resetPasswordConfirmRequest(
  db: Pool,
  body: { email: string; code: string; newPassword: string },
): Promise<OkoApiResponse<{ message: string }>> {
  try {
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: "Missing fields",
      };
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return passwordError;
    }

    const verificationResult = await verifyEmailCode(db, {
      email,
      verification_code: code,
    });

    if (!verificationResult.success) {
      return {
        success: false,
        code: "INVALID_VERIFICATION_CODE",
        msg: "Invalid or expired verification code",
      };
    }

    const customerAccountResult =
      await getCTDUserWithCustomerAndPasswordHashByEmail(db, email);

    if (!customerAccountResult.success || !customerAccountResult.data) {
      return {
        success: false,
        code: "CUSTOMER_ACCOUNT_NOT_FOUND",
        msg: "User not found",
      };
    }

    const hashedNewPassword = await hashPassword(newPassword);
    const updateResult = await updateCustomerDashboardUserPassword(db, {
      user_id: customerAccountResult.data.user.user_id,
      password_hash: hashedNewPassword,
    });

    if (!updateResult.success) {
      return {
        success: false,
        code: "FAILED_TO_UPDATE_PASSWORD",
        msg: "Failed to update password",
      };
    }

    return {
      success: true,
      data: { message: "Password reset successfully" },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `resetPasswordConfirmRequest error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
