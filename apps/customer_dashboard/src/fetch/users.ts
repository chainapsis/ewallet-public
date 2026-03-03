import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  ChangePasswordResponse,
  LoginResponse,
  SendVerificationResponse,
} from "@oko-wallet/oko-types/ct_dashboard";

import { CUSTOMER_V1_ENDPOINT } from "./customers";
import { errorHandle } from "./utils";

export async function requestSignIn(
  email: string,
  password: string,
): Promise<OkoApiResponse<LoginResponse>> {
  return errorHandle<LoginResponse>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/auth/signin`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );
}

export async function requestSendVerificationCode(
  email: string,
): Promise<OkoApiResponse<SendVerificationResponse>> {
  return errorHandle<SendVerificationResponse>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/auth/send-code`, {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );
}

export async function requestVerifyCodeAndLogin(
  email: string,
  code: string,
): Promise<OkoApiResponse<LoginResponse>> {
  return errorHandle<LoginResponse>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/auth/verify-login`, {
      method: "POST",
      body: JSON.stringify({ email, verification_code: code }),
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );
}

export async function requestChangePassword(
  email: string,
  originalPassword: string | undefined,
  newPassword: string,
  token: string,
): Promise<OkoApiResponse<ChangePasswordResponse>> {
  return errorHandle<any>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/auth/change-password`, {
      method: "POST",
      body: JSON.stringify({
        email,
        ...(originalPassword && { original_password: originalPassword }),
        new_password: newPassword,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }),
  );
}

export async function requestForgotPassword(
  email: string,
): Promise<OkoApiResponse<{ message: string }>> {
  return errorHandle<{ message: string }>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/auth/forgot-password`, {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    }),
  );
}

export async function requestVerifyResetCode(
  email: string,
  code: string,
): Promise<OkoApiResponse<{ isValid: boolean }>> {
  return errorHandle<{ isValid: boolean }>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/auth/verify-reset-code`, {
      method: "POST",
      body: JSON.stringify({ email, code }),
      headers: { "Content-Type": "application/json" },
    }),
  );
}

export async function requestResetPasswordConfirm(
  email: string,
  code: string,
  newPassword: string,
): Promise<OkoApiResponse<{ message: string }>> {
  return errorHandle<{ message: string }>(() =>
    fetch(`${CUSTOMER_V1_ENDPOINT}/customer/auth/reset-password-confirm`, {
      method: "POST",
      body: JSON.stringify({ email, code, newPassword }),
      headers: { "Content-Type": "application/json" },
    }),
  );
}
