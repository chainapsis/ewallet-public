import express from "express";
import type { Pool } from "pg";
import type { Bytes } from "@oko-wallet/bytes";
import winston from "winston";
import { commitRevealCommit } from "@oko-wallet-api/routes/tss_v2/commit";
import { commitRevealMiddleware } from "@oko-wallet-api/middleware/commit_reveal";
import { keygenV2 } from "@oko-wallet-api/routes/tss_v2/keygen";
import { userSignInV2 } from "@oko-wallet-api/routes/tss_v2/user_signin";
import { userReshareV2 } from "@oko-wallet-api/routes/tss_v2/user_reshare";
import { reportKeyShareNotFound } from "@oko-wallet-api/routes/tss_v2/report_key_share_not_found";
import { userJwtMiddlewareV2 } from "@oko-wallet-api/middleware/auth/keplr_auth";
import { userCheckEmailV2 } from "@oko-wallet-api/routes/tss_v2/user_check_email";
import { keygenEd25519 } from "@oko-wallet-api/routes/tss_v2/keygen_ed25519";
import { runKeygen as runKeygenV1 } from "@oko-wallet-api/api/tss/v1/keygen";

import { mockOAuthMiddleware } from "./mock_oauth";

export interface OkoApiServerKeypair {
  privateKey: Bytes<32>;
  publicKey: Bytes<32>;
}

const testLogger = winston.createLogger({
  level: "error",
  silent: true,
  transports: [new winston.transports.Console()],
});

export function createOkoApiApp(
  pool: Pool,
  serverKeypair: OkoApiServerKeypair,
): express.Application {
  const app = express();
  app.use(express.json());

  app.locals.db = pool;
  app.locals.server_keypair = serverKeypair;
  app.locals.logger = testLogger;
  app.locals.jwt_secret = "test_jwt_secret";
  app.locals.jwt_expires_in = "7d";
  app.locals.encryption_secret = "test_encryption_secret";

  app.post("/tss/v2/commit", commitRevealCommit);

  app.post(
    "/tss/v2/keygen",
    commitRevealMiddleware("keygen"),
    mockOAuthMiddleware,
    ((_req, res, next) => {
      res.locals.api_key = { customer_id: "test_customer_id" };
      next();
    }) as express.RequestHandler,
    keygenV2,
  );

  app.post(
    "/tss/v2/user/signin",
    commitRevealMiddleware("signin"),
    mockOAuthMiddleware,
    ((_req, res, next) => {
      res.locals.api_key = { customer_id: "test_customer_id" };
      next();
    }) as express.RequestHandler,
    userSignInV2,
  );

  app.post(
    "/tss/v2/user/reshare",
    commitRevealMiddleware("reshare"),
    mockOAuthMiddleware,
    userReshareV2,
  );

  // Public route: check user/KSN state
  app.post("/tss/v2/user/check", userCheckEmailV2);

  // JWT-authenticated route (no commit-reveal): report nodes with missing keyshares
  app.post(
    "/tss/v2/user/report_key_share_not_found",
    userJwtMiddlewareV2,
    reportKeyShareNotFound,
  );

  // v2 keygen ed25519 (commit-reveal + mock OAuth)
  app.post(
    "/tss/v2/keygen_ed25519",
    commitRevealMiddleware("keygen_ed25519"),
    mockOAuthMiddleware,
    keygenEd25519,
  );

  // v1 keygen (secp256k1 only) using mock OAuth
  app.post("/tss/v1/keygen", mockOAuthMiddleware, async (req, res) => {
    const state = app.locals;
    const oauthUser = res.locals.oauth_user;
    const auth_type = oauthUser.type;
    const user_identifier = oauthUser.user_identifier;
    const body = req.body;

    const jwtConfig = {
      secret: state.jwt_secret,
      expires_in: state.jwt_expires_in,
    };

    const result = await runKeygenV1(
      state.db,
      jwtConfig,
      {
        auth_type,
        user_identifier,
        keygen_2: body.keygen_2,
        email: oauthUser.email,
        name: oauthUser.name,
        metadata: oauthUser.metadata,
      },
      state.encryption_secret,
      state.logger,
      "test_customer_id",
    );
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json({ success: true, data: result.data });
  });

  return app;
}
