import express from "express";

import { changePassword } from "./change_password";
import { createApiKey } from "./create_api_key";
import { deleteApiKey } from "./delete_api_key";
import { forgotPassword } from "./forgot_password";
import { getCustomerApiKeys } from "./get_customer_api_keys";
import { getCustomerInfo } from "./get_customer_info";
import { resetPasswordConfirm } from "./reset_password_confirm";
import { sendCode } from "./send_code";
import { signIn } from "./signin";
import { updateCustomerInfoRoute } from "./update_customer_info";
import { verifyLogin } from "./verify_login";
import { verifyResetCode } from "./verify_reset_code";
import { customerJwtMiddleware } from "@oko-wallet-ctd-api/middleware/auth";
import { customerLogoUploadMiddleware } from "@oko-wallet-ctd-api/middleware/multer";
import { rateLimitMiddleware } from "@oko-wallet-ctd-api/middleware/rate_limit";

export function makeCustomerRouter() {
  const router = express.Router();

  router.use(rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }));

  router.post(
    "/customer/auth/forgot-password",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    forgotPassword,
  );

  router.post(
    "/customer/auth/verify-reset-code",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    verifyResetCode,
  );

  router.post(
    "/customer/auth/reset-password-confirm",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    resetPasswordConfirm,
  );

  router.post(
    "/customer/auth/send-code",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    sendCode,
  );

  router.post(
    "/customer/auth/verify-login",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    verifyLogin,
  );

  router.post(
    "/customer/auth/signin",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    signIn,
  );

  router.post(
    "/customer/auth/change-password",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    customerJwtMiddleware,
    changePassword,
  );

  router.post("/customer/info", customerJwtMiddleware, getCustomerInfo);

  router.post("/customer/api_keys", customerJwtMiddleware, getCustomerApiKeys);

  router.post(
    "/customer/api_keys/create",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    customerJwtMiddleware,
    createApiKey,
  );

  router.post(
    "/customer/api_keys/delete",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    customerJwtMiddleware,
    deleteApiKey,
  );

  router.post(
    "/customer/update_info",
    // rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    customerJwtMiddleware,
    customerLogoUploadMiddleware,
    updateCustomerInfoRoute,
  );

  return router;
}
