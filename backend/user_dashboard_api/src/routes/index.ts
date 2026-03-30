import express, { type IRouter } from "express";

import { getConnectedApps } from "./get_connected_apps";
import { userJwtMiddleware } from "@oko-wallet-usrd-api/middleware/auth";
import { rateLimitMiddleware } from "@oko-wallet-usrd-api/middleware/rate_limit";

export function makeUserRouter() {
  const router = express.Router() as IRouter;

  router.use(rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }));

  router.post("/get_connected_apps", userJwtMiddleware, getConnectedApps);

  return router;
}
