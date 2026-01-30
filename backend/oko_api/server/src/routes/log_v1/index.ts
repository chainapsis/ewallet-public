import express from "express";

import { rateLimitMiddleware } from "@oko-wallet-api/middleware/rate_limit";
import { postLog } from "./post_log";

// interface LogRouterOptions {
//   esUrl: string | null;
//   esIndex: string | null;
//   esUsername: string | null;
//   esPassword: string | null;
// }

export function makeLogRouterV1() {
  const router = express.Router();

  // const clientLogger = initClientLogger({
  //   level: "info",
  //   esUrl: options.esUrl,
  //   esIndex: options.esIndex,
  //   esUsername: options.esUsername,
  //   esPassword: options.esPassword,
  //   console: false,
  // });

  router.post(
    "/",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 100 }),
    postLog,
  );

  return router;
}
