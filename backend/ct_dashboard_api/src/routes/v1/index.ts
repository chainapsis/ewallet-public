import express from "express";

import { changePassword } from "./change_password";
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

const ONE_MINUTE_SEC = 1 * 60;

export function makeCustomerRouter() {
  const router = express.Router();

  router.use(
    rateLimitMiddleware({ windowSeconds: ONE_MINUTE_SEC, maxRequests: 20 }),
  );

  router.post("/customer/auth/forgot-password", forgotPassword);

  router.post("/customer/auth/verify-reset-code", verifyResetCode);

  router.post("/customer/auth/reset-password-confirm", resetPasswordConfirm);

  router.post("/customer/auth/send-code", sendCode);

  router.post("/customer/auth/verify-login", verifyLogin);

  router.post("/customer/auth/signin", signIn);

  router.post(
    "/customer/auth/change-password",
    customerJwtMiddleware,
    changePassword,
  );

  router.post("/customer/info", customerJwtMiddleware, getCustomerInfo);

  router.post("/customer/api_keys", customerJwtMiddleware, getCustomerApiKeys);

  router.post(
    "/customer/update_info",
    customerJwtMiddleware,
    customerLogoUploadMiddleware,
    updateCustomerInfoRoute,
  );

  return router;
}
