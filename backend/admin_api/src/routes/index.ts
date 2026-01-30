import express from "express";

import { typeformWebhookMiddleware } from "../middleware/typeform_webhook";
import { activate_ks_node } from "./activate_ks_node";
import { create_customer } from "./create_customer";
import { create_customer_by_typeform } from "./create_customer_by_typeform";
import { create_ks_node } from "./create_ks_node";
import { deactivate_ks_node } from "./deactivate_ks_node";
import { delete_customer } from "./delete_customer";
import { delete_ks_node } from "./delete_ks_node";
import { get_all_ks_nodes } from "./get_all_ks_nodes";
import { get_customer } from "./get_customer";
import { get_customer_list } from "./get_customer_list";
import { get_ks_node_by_id } from "./get_ks_node_by_id";
import { get_ksn_health_checks } from "./get_ksn_health_checks";
import { get_tss_all_activation_setting } from "./get_tss_all_activation_setting";
import { get_tss_session_list } from "./get_tss_session_list";
import { get_user_list } from "./get_user_list";
import { get_wallet_list } from "./get_wallet_list";
import { resend_customer_user_password } from "./resend_customer_user_password";
import { set_tss_all_activation_setting } from "./set_tss_all_activation_setting";
import { update_ks_node } from "./update_ks_node";
import { user_login } from "./user_login";
import { user_logout } from "./user_logout";
import { adminAuthMiddleware } from "@oko-wallet-admin-api/middleware/auth";
import { customerLogoUploadMiddleware } from "@oko-wallet-admin-api/middleware/multer";
import { rateLimitMiddleware } from "@oko-wallet-admin-api/middleware/rate_limit";

export function makeOkoAdminRouter() {
  const router = express.Router();

  router.post(
    "/customer/create_customer",
    adminAuthMiddleware,
    customerLogoUploadMiddleware,
    create_customer,
  );

  router.get(
    "/customer/get_customer_list",
    adminAuthMiddleware,
    get_customer_list,
  );

  router.get(
    "/customer/get_customer/:customer_id",
    adminAuthMiddleware,
    get_customer,
  );

  router.post(
    "/customer/delete_customer/:customer_id",
    adminAuthMiddleware,
    delete_customer,
  );

  router.post(
    "/customer/resend_customer_user_password",
    adminAuthMiddleware,
    resend_customer_user_password,
  );

  router.post(
    "/user/login",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
    user_login,
  );

  router.post("/user/logout", adminAuthMiddleware, user_logout);

  router.post(
    "/tss/get_tss_session_list",
    adminAuthMiddleware,
    get_tss_session_list,
  );

  router.post(
    "/tss/get_tss_all_activation_setting",
    adminAuthMiddleware,
    get_tss_all_activation_setting,
  );

  router.post(
    "/tss/set_tss_all_activation_setting",
    adminAuthMiddleware,
    set_tss_all_activation_setting,
  );

  router.post("/wallet/get_wallet_list", adminAuthMiddleware, get_wallet_list);

  router.post("/wallet/get_user_list", adminAuthMiddleware, get_user_list);

  router.post(
    "/ks_node/get_all_ks_nodes",
    adminAuthMiddleware,
    get_all_ks_nodes,
  );

  router.post(
    "/ks_node/get_ks_node_by_id",
    adminAuthMiddleware,
    get_ks_node_by_id,
  );

  router.post("/ks_node/create_ks_node", adminAuthMiddleware, create_ks_node);

  router.post(
    "/ks_node/deactivate_ks_node",
    adminAuthMiddleware,
    deactivate_ks_node,
  );

  router.post("/ks_node/delete_ks_node", adminAuthMiddleware, delete_ks_node);

  router.post("/ks_node/update_ks_node", adminAuthMiddleware, update_ks_node);

  router.post(
    "/ks_node/activate_ks_node",
    adminAuthMiddleware,
    activate_ks_node,
  );

  router.post(
    "/ks_node/get_ksn_health_checks",
    adminAuthMiddleware,
    get_ksn_health_checks,
  );

  router.post(
    "/customer/create_customer_by_typeform",
    typeformWebhookMiddleware,
    create_customer_by_typeform,
  );

  return router;
}
