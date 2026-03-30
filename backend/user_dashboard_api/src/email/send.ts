import { getCTDUserWithCustomerAndPasswordHashByEmail } from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import {
  createEmailVerification,
  getLatestPendingVerification,
} from "@oko-wallet/oko-pg-interface/email_verifications";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  SendVerificationRequest,
  SendVerificationResponse,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Pool } from "pg";

import {
  CAN_RESEND_CODE_INTERVAL_SECONDS,
  EMAIL_REGEX,
} from "@oko-wallet-usrd-api/constants";
import {
  generateVerificationCode,
  sendVerificationEmail,
} from "@oko-wallet-usrd-api/email";

export async function sendEmailVerificationCode(
  db: Pool,
  request: SendVerificationRequest,
): Promise<OkoApiResponse<SendVerificationResponse>> {
  if (!request.email) {
    return {
      success: false,
      code: "INVALID_REQUEST",
      msg: "email is required",
    };
  }

  // Basic email validation
  if (!EMAIL_REGEX.test(request.email)) {
    return {
      success: false,
      code: "INVALID_EMAIL_OR_PASSWORD",
      msg: "Invalid email format",
    };
  }

  const [customerAccountResult, activeVerificationResult] = await Promise.all([
    getCTDUserWithCustomerAndPasswordHashByEmail(db, request.email),
    getLatestPendingVerification(db, request.email),
  ]);

  // Check if customer account exists
  if (!customerAccountResult.success) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to get customer account: ${customerAccountResult.err}`,
    };
  }

  if (customerAccountResult.data === null) {
    return {
      success: false,
      code: "CUSTOMER_ACCOUNT_NOT_FOUND",
      msg: "Account not found",
    };
  }

  if (!activeVerificationResult.success) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to get active verification: ${activeVerificationResult.err}`,
    };
  }

  const activeVerification = activeVerificationResult.data;

  // Check if there's already an active verification
  if (activeVerification !== null) {
    const diffTime = Math.abs(
      Date.now() - activeVerification.created_at.getTime(),
    );
    const diffSeconds = Math.ceil(diffTime / 1000);
    if (diffSeconds < CAN_RESEND_CODE_INTERVAL_SECONDS) {
      return {
        success: false,
        code: "VERIFICATION_CODE_ALREADY_SENT",
        msg: `Verification code already sent. Please wait for ${CAN_RESEND_CODE_INTERVAL_SECONDS - diffSeconds} seconds`,
      };
    }
  }

  // Generate verification code
  const verificationCode = generateVerificationCode();

  const expiresAt = new Date();
  expiresAt.setMinutes(
    expiresAt.getMinutes() + request.email_verification_expiration_minutes,
  );

  // Save to database
  const createEmailVerificationRes = await createEmailVerification(db, {
    email: request.email,
    verification_code: verificationCode,
    expires_at: expiresAt,
  });

  if (!createEmailVerificationRes.success) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to create email verification: ${createEmailVerificationRes.err}`,
    };
  }

  // Send email
  const emailResult = await sendVerificationEmail(
    request.email,
    verificationCode,
    customerAccountResult.data.label,
    request.from_email,
    request.email_verification_expiration_minutes,
    request.smtp_config,
  );

  if (!emailResult.success) {
    return {
      success: false,
      code: "FAILED_TO_SEND_EMAIL",
      msg: `Failed to send verification email: ${emailResult.error}`,
    };
  }

  return {
    success: true,
    data: {
      message: "Verification code sent successfully",
      expires_at: createEmailVerificationRes.data.expires_at.toISOString(),
    },
  };
}
