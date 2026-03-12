import { Router } from "express";

import { saveReferralV2 } from "./save_referral";
import { userJwtMiddlewareV2 } from "@oko-wallet-api/middleware/auth/keplr_auth";
import { rateLimitMiddleware } from "@oko-wallet-api/middleware/rate_limit";

export function makeSocialLoginV2Router() {
  const router = Router();

  router.post(
    "/referral",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
    userJwtMiddlewareV2,
    saveReferralV2,
  );

  return router;
}
