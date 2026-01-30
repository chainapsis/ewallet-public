import { type Express } from "express";
import { makeCustomerRouter } from "@oko-wallet/ct-dashboard-api";
import { makeOkoAdminRouter } from "@oko-wallet/admin-api";
import { makeUserRouter } from "@oko-wallet/user-dashboard-api";
import { getStatus } from "./get_status";
import { makeSocialLoginRouter } from "./social_login_v1";
import { makeSocialLoginV2Router } from "./social_login_v2";
import { makeTSSRouterV1 } from "./tss_v1";
import { makeTSSRouterV2 } from "./tss_v2";
import { makeAttachedV1Router } from "./attached_v1";
import { makeLogRouterV1 } from "./log_v1";

export function setRoutes(app: Express) {
  app.use("/customer_dashboard/v1", makeCustomerRouter());

  app.use("/attached/v1", makeAttachedV1Router());

  app.use("/oko_admin/v1", makeOkoAdminRouter());

  app.use("/tss/v1", makeTSSRouterV1());

  app.use("/tss/v2", makeTSSRouterV2());

  app.use("/user_dashboard/v1", makeUserRouter());

  app.use("/log/v1", makeLogRouterV1());

  app.use("/social-login/v1", makeSocialLoginRouter());

  app.use("/social-login/v2", makeSocialLoginV2Router());

  app.get("/status", getStatus);
}
