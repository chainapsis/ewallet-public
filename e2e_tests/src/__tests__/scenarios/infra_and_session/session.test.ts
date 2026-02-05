import request from "supertest";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { createTestContext, type TestContext } from "@e2e/utils/test_context";
import {
  generateSessionId,
  generateClientKeypair,
  computeIdTokenHash,
} from "@e2e/utils/signature";

describe("e2e_test_session_timeout_and_duplicate_commit", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "session_user_123";
  const ID_TOKEN = "mock_id_token";
  const AUTH_TYPE: AuthType = "google";

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  async function expireOkoApiSession(sessionId: string) {
    await ctx.okoApiPool.query(
      `UPDATE commit_reveal_sessions SET expires_at = NOW() - INTERVAL '1 minute' WHERE session_id = $1`,
      [sessionId],
    );
  }

  async function expireKsnSession(nodeIndex: number, sessionId: string) {
    await ctx.ksnPools[nodeIndex].query(
      `UPDATE "2_commit_reveal_sessions" SET expires_at = NOW() - INTERVAL '1 minute' WHERE session_id = $1`,
      [sessionId],
    );
  }

  it("SESSION_EXPIRED: oko_api signin after expiry returns 410", async () => {
    await ctx.resetAllDatabases();
    const client = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, ID_TOKEN);

    const commit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_in",
      client_ephemeral_pubkey: client.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(commit.status).toBe(200);

    // Expire session
    await expireOkoApiSession(sessionId);

    // Try signin → 410 SESSION_EXPIRED
    const res = await request(ctx.okoApiApp)
      .post("/tss/v2/user/signin")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        cr_session_id: sessionId,
        cr_signature: client.publicKey.toHex().padEnd(128, "0"),
      });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe("SESSION_EXPIRED");
  });

  it("SESSION_EXPIRED: KSN register after expiry returns 410", async () => {
    await ctx.resetAllDatabases();
    const client = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, ID_TOKEN);

    const commit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: client.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(commit.status).toBe(200);

    await expireKsnSession(0, sessionId);

    const res = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: {
            public_key: "03" + "a".repeat(64),
            share: "aa".repeat(64),
          },
          ed25519: { public_key: "b".repeat(64), share: "bb".repeat(64) },
        },
        cr_session_id: sessionId,
        cr_signature: client.publicKey.toHex().padEnd(128, "0"),
      });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe("SESSION_EXPIRED");
  });

  it("SESSION_ALREADY_EXISTS: oko_api duplicate commit returns 409", async () => {
    await ctx.resetAllDatabases();
    const client = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, ID_TOKEN);
    const payload = {
      session_id: sessionId,
      operation_type: "sign_up",
      client_ephemeral_pubkey: client.publicKey.toHex(),
      id_token_hash: idHash,
    };
    const first = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send(payload);
    expect(first.status).toBe(200);
    const second = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send(payload);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("SESSION_ALREADY_EXISTS");
  });

  it("SESSION_ALREADY_EXISTS: KSN duplicate commit returns 409", async () => {
    await ctx.resetAllDatabases();
    const client = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, ID_TOKEN);
    const payload = {
      session_id: sessionId,
      operation_type: "sign_in",
      client_ephemeral_pubkey: client.publicKey.toHex(),
      id_token_hash: idHash,
    };
    const first = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send(payload);
    expect(first.status).toBe(200);
    const second = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send(payload);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("SESSION_ALREADY_EXISTS");
  });
});
