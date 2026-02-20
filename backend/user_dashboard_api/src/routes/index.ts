import { comparePassword, hashPassword } from "@oko-wallet/crypto-js";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/common";
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
import { getWalletById } from "@oko-wallet/oko-pg-interface/oko_wallets";
import { getConnectionsByUserId } from "@oko-wallet/oko-pg-interface/user_customer_connections";
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
import type { ConnectedApp } from "@oko-wallet/oko-types/user_dashboard";
import express, { type IRouter } from "express";
import type { Pool } from "pg";

import { changeCustomerPassword } from "./change_ct_password";
import { getConnectedApps } from "./get_connected_apps";
import { getCustomerApiKeys } from "./get_customer_api_keys";
import { getCustomerInfo } from "./get_customer_info";
import { sendVerificationCodeRoute } from "./send_verification_code";
import { signInCustomer } from "./sign_in_customer";
import { updateCustomerInfoRoute } from "./update_customer_info";
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
  type UserAuthenticatedRequest,
  userJwtMiddleware,
} from "@oko-wallet-usrd-api/middleware/auth";
import { multerMiddleware } from "@oko-wallet-usrd-api/middleware/multer";
import { rateLimitMiddleware } from "@oko-wallet-usrd-api/middleware/rate_limit";
// import { setUserRoutes } from "@oko-wallet-usrd-api/routes/user";
// import { setUserAuthRoutes } from "@oko-wallet-usrd-api/routes/user_auth";

export function makeUserRouter() {
  const router = express.Router() as IRouter;

  router.use(rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }));

  router.post("/customer/auth/send-code", sendVerificationCodeRoute);

  router.post("/customer/auth/verify-login", verifyEmailAndLogin);

  router.post("/customer/auth/signin", signInCustomer);

  router.post(
    "/customer/auth/change-password",
    customerJwtMiddleware,
    changeCustomerPassword,
  );

  router.post("/customer/info", customerJwtMiddleware, getCustomerInfo);

  router.post("/customer/api_keys", customerJwtMiddleware, getCustomerApiKeys);

  router.post(
    "/customer/update_info",
    customerJwtMiddleware,
    multerMiddleware,
    updateCustomerInfoRoute,
  );

  router.post("/get_connected_apps", userJwtMiddleware, getConnectedApps);

  return router;
}
