import express from "express";

import { getGithubToken } from "./get_github_token";
import { getXToken } from "./get_x_token";
import { referralCivitia } from "./referral_civitia";
import { saveReferral } from "./save_referral";
import { verifyXUser } from "./verify_x_user";
import { userJwtMiddleware } from "@oko-wallet-api/middleware/auth/keplr_auth";
import { rateLimitMiddleware } from "@oko-wallet-api/middleware/rate_limit";

export function makeSocialLoginRouter() {
  const router = express.Router();

  router.post(
    "/x/get-token",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
    getXToken,
  );

  router.post(
    "/github/get-token",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
    getGithubToken,
  );

  router.get(
    "/x/verify-user",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
    verifyXUser,
  );

  router.post(
    "/referral",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
    userJwtMiddleware,
    saveReferral,
  );

  router.get(
    "/referrals/civitia",
    rateLimitMiddleware({ windowSeconds: 60, maxRequests: 30 }),
    referralCivitia,
  );

  return router;
}
