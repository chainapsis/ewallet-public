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

import { changeCustomerPassword } from "./change_ct_password";
import { sendVerificationCodeRoute } from "./send_verification_code";
import { signInCustomer } from "./sign_in_customer";
import { verifyEmailAndLogin } from "./verify_email_and_login";
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

// export function setUserAuthRoutes(router: Router) {
//   router.post(
//     "/customer/auth/send-code",
//     rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
//     sendVerificationCodeRoute,
//   );
//
//   router.post(
//     "/customer/auth/verify-login",
//     rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
//     verifyEmailAndLogin,
//   );
//
//   router.post(
//     "/customer/auth/signin",
//     rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
//     signInCustomer,
//   );
//
//   router.post(
//     "/customer/auth/change-password",
//     rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
//     customerJwtMiddleware,
//     changeCustomerPassword,
//   );
// }
