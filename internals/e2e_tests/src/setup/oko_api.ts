import express from "express";
import type { Pool } from "pg";
import type { Bytes } from "@oko-wallet/bytes";
import winston from "winston";

import { commitRevealCommit } from "@oko-wallet-api/routes/tss_v2/commit";
import { commitRevealMiddleware } from "@oko-wallet-api/middleware/commit_reveal";
import { keygenV2 } from "@oko-wallet-api/routes/tss_v2/keygen";
import { userSignInV2 } from "@oko-wallet-api/routes/tss_v2/user_signin";
import { userReshareV2 } from "@oko-wallet-api/routes/tss_v2/user_reshare";
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
    keygenV2,
  );

  app.post(
    "/tss/v2/user/signin",
    commitRevealMiddleware("signin"),
    mockOAuthMiddleware,
    userSignInV2,
  );

  app.post(
    "/tss/v2/user/reshare",
    commitRevealMiddleware("reshare"),
    mockOAuthMiddleware,
    userReshareV2,
  );

  return app;
}
