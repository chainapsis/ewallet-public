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
import { registerKeyshareEd25519 } from "@oko-wallet-ksn-server/routes/key_share_v2/ed25519";
import { registerKeyShare as registerKeyShareV1 } from "@oko-wallet-ksn-server/api/key_share";
import { Bytes as BytesLib } from "@oko-wallet/bytes";
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

  // Unified reshare endpoint: handles both existing wallet updates and new wallet registration
  app.post(
    "/keyshare/v2/reshare",
    commitRevealMiddleware("reshare"),
    mockOAuthMiddleware,
    keyshareV2Reshare,
  );

  // Minimal v1 register (secp256k1-only or ed25519-only) using mock OAuth
  app.post("/keyshare/v1/register", mockOAuthMiddleware, async (req, res) => {
    try {
      const state = app.locals as ServerState;
      const oauthUser = res.locals.oauth_user;
      const {
        auth_type = "google",
        curve_type,
        public_key,
        share,
      } = req.body ?? {};

      const pkLen = curve_type === "ed25519" ? 32 : 33;
      const publicKeyBytesRes = BytesLib.fromHexString(public_key, pkLen);
      if (!publicKeyBytesRes.success) {
        return res.status(400).json({
          success: false,
          code: "PUBLIC_KEY_INVALID",
          msg: `Public key is not valid: ${publicKeyBytesRes.err}`,
        });
      }
      const shareBytesRes = BytesLib.fromHexString(share, 64);
      if (!shareBytesRes.success) {
        return res.status(400).json({
          success: false,
          code: "SHARE_INVALID",
          msg: `Share is not valid: ${shareBytesRes.err}`,
        });
      }

      const result = await registerKeyShareV1(
        state.db,
        {
          user_auth_id: oauthUser.user_identifier,
          auth_type,
          curve_type,
          public_key: publicKeyBytesRes.data,
          share: shareBytesRes.data,
        },
        state.encryptionSecret,
      );
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.status(200).json({ success: true, data: void 0 });
    } catch (e) {
      return res
        .status(500)
        .json({ success: false, code: "UNKNOWN_ERROR", msg: String(e) });
    }
  });

  // Minimal v1 check: always report exists true for requested curve
  app.post("/keyshare/v1/check", (req, res) => {
    return res.status(200).json({
      success: true,
      data: { exists: true },
    });
  });

  // v2 register ed25519 route with commit-reveal + mock OAuth
  app.post(
    "/keyshare/v2/register/ed25519",
    commitRevealMiddleware("register_ed25519"),
    mockOAuthMiddleware,
    registerKeyshareEd25519,
  );

  return app;
}
