import express, { type IRouter } from "express";

import { changeCustomerPassword } from "./change_ct_password";
import { getConnectedApps } from "./get_connected_apps";
import { getCustomerApiKeys } from "./get_customer_api_keys";
import { getCustomerInfo } from "./get_customer_info";
import { sendVerificationCodeRoute } from "./send_verification_code";
import { signInCustomer } from "./sign_in_customer";
import { updateCustomerInfoRoute } from "./update_customer_info";
import { verifyEmailAndLogin } from "./verify_email_and_login";
import {
  customerJwtMiddleware,
  userJwtMiddleware,
} from "@oko-wallet-usrd-api/middleware/auth";
import { multerMiddleware } from "@oko-wallet-usrd-api/middleware/multer";
import { rateLimitMiddleware } from "@oko-wallet-usrd-api/middleware/rate_limit";

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
