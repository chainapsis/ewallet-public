import express from "express";
import type { Pool } from "pg";
import type { Bytes } from "@oko-wallet/bytes";
import dayjs from "dayjs";

import { commit } from "@oko-wallet-ksn-server/routes/key_share_v2/commit";
import { commitRevealMiddleware } from "@oko-wallet-ksn-server/middlewares";
import { keyshareV2Register } from "@oko-wallet-ksn-server/routes/key_share_v2/register";
import { keyshareV2Check } from "@oko-wallet-ksn-server/routes/key_share_v2/check";
import { getKeysharesV2 } from "@oko-wallet-ksn-server/routes/key_share_v2/get_key_shares";
import { keyshareV2Reshare } from "@oko-wallet-ksn-server/routes/key_share_v2/reshare";
import { keyshareV2ReshareRegister } from "@oko-wallet-ksn-server/routes/key_share_v2/reshare_register";
import type { ServerState } from "@oko-wallet-ksn-server/state";
import { mockOAuthMiddleware } from "./mock_oauth";

export interface KsnServerKeypair {
  privateKey: Bytes<32>;
  publicKey: Bytes<32>;
}

export function createKsnApp(
  pool: Pool,
  serverKeypair: KsnServerKeypair,
  encryptionSecret: string = "test_enc_secret",
): express.Application {
  const app = express();
  app.use(express.json());

  app.locals = {
    db: pool,
    encryptionSecret,
    serverKeypair,
    telegram_bot_token: "test_telegram_token",
    is_db_backup_checked: false,
    launch_time: dayjs().toISOString(),
    git_hash: null,
    version: "test",
  } satisfies ServerState;

  app.post("/keyshare/v2/commit", commit);
  app.post("/keyshare/v2/check", keyshareV2Check);

  app.post(
    "/keyshare/v2/register",
    commitRevealMiddleware("register"),
    mockOAuthMiddleware,
    keyshareV2Register,
  );

  app.post(
    "/keyshare/v2",
    commitRevealMiddleware("get_key_shares"),
    mockOAuthMiddleware,
    getKeysharesV2,
  );

  app.post(
    "/keyshare/v2/reshare",
    commitRevealMiddleware("reshare"),
    mockOAuthMiddleware,
    keyshareV2Reshare,
  );

  app.post(
    "/keyshare/v2/reshare/register",
    commitRevealMiddleware("reshare_register"),
    mockOAuthMiddleware,
    keyshareV2ReshareRegister,
  );

  return app;
}
