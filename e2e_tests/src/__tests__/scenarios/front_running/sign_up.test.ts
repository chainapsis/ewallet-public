import request from "supertest";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { createTestContext, type TestContext } from "@e2e/utils/test_context";
import {
  generateSessionId,
  generateClientKeypair,
  computeIdTokenHash,
  createRevealSignature,
} from "@e2e/utils/signature";

describe("e2e_test_front_running_sign_up", () => {
  let ctx: TestContext;
  const AUTH_TYPE: AuthType = "google";

  const TOKEN_A = "id_token_A";
  const TOKEN_B = "id_token_B";
  const TEST_SEED_SHARE = "a".repeat(64) + "b".repeat(64);

  beforeAll(async () => {
    ctx = await createTestContext({ ksnCount: 6 });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    await ctx.resetAllDatabases();
  });

  it("session hijacking: KSN register with different id_token than committed → INVALID_REQUEST", async () => {
    const client = generateClientKeypair();
    const sessionId = generateSessionId();

    // KSN commit with TOKEN_A
    const idHashA = computeIdTokenHash(AUTH_TYPE, TOKEN_A);
    const commit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: client.publicKey.toHex(),
        id_token_hash: idHashA,
      });
    expect(commit.status).toBe(200);

    // Try register with TOKEN_B (different)
    const sig = createRevealSignature(
      client.privateKey,
      commit.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      TOKEN_B,
      "sign_up",
      "register",
    );
    const reg = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register")
      .set("x-mock-user-id", "userX")
      .set("Authorization", `Bearer ${TOKEN_B}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: {
            public_key: "03" + "a".repeat(64),
            share: "aa".repeat(64),
          },
          ed25519: { public_key: "b".repeat(64), share: "bb".repeat(64), seed_share: TEST_SEED_SHARE },
        },
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(reg.status).toBe(400);
    expect(reg.body.code).toBe("INVALID_REQUEST");
  });

  it("replay: KSN register called twice → API_ALREADY_CALLED", async () => {
    const client = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, TOKEN_A);

    const commit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: client.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(commit.status).toBe(200);

    const sig = createRevealSignature(
      client.privateKey,
      commit.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      TOKEN_A,
      "sign_up",
      "register",
    );
    const payload = {
      auth_type: AUTH_TYPE,
      wallets: {
        secp256k1: {
          public_key: "03" + "a".repeat(64),
          share: "aa".repeat(64),
        },
        ed25519: { public_key: "b".repeat(64), share: "bb".repeat(64) },
      },
      cr_session_id: sessionId,
      cr_signature: sig,
    };

    const first = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register")
      .set("x-mock-user-id", "userX")
      .set("Authorization", `Bearer ${TOKEN_A}`)
      .send(payload);
    expect(first.status).toBe(200);

    const second = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register")
      .set("x-mock-user-id", "userX")
      .set("Authorization", `Bearer ${TOKEN_A}`)
      .send(payload);
    expect([400, 409]).toContain(second.status);
    expect(["API_ALREADY_CALLED", "INVALID_REQUEST"]).toContain(
      second.body.code,
    );
  });

  it("op/api mismatch: sign_up session calling get_key_shares → INVALID_REQUEST", async () => {
    const client = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, TOKEN_A);

    const commit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: client.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(commit.status).toBe(200);

    const sig = createRevealSignature(
      client.privateKey,
      commit.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      TOKEN_A,
      "sign_up",
      "get_key_shares",
    );
    const res = await request(ctx.ksnApps[0])
      .post("/keyshare/v2")
      .set("x-mock-user-id", "userX")
      .set("Authorization", `Bearer ${TOKEN_A}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: { secp256k1: "03" + "a".repeat(64), ed25519: "b".repeat(64) },
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_REQUEST");
  });

  it("wrong node_pubkey: signature for node A used on node B → INVALID_SIGNATURE", async () => {
    const client = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, TOKEN_A);

    const commitA = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: client.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(commitA.status).toBe(200);
    const commitB = await request(ctx.ksnApps[1])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: client.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(commitB.status).toBe(200);

    // Signature bound to node A
    const sigA = createRevealSignature(
      client.privateKey,
      commitA.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      TOKEN_A,
      "sign_up",
      "register",
    );

    // Call register on node B with sigA → INVALID_SIGNATURE
    const reg = await request(ctx.ksnApps[1])
      .post("/keyshare/v2/register")
      .set("x-mock-user-id", "userX")
      .set("Authorization", `Bearer ${TOKEN_A}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: {
            public_key: "03" + "a".repeat(64),
            share: "aa".repeat(64),
          },
          ed25519: { public_key: "b".repeat(64), share: "bb".repeat(64), seed_share: TEST_SEED_SHARE },
        },
        cr_session_id: sessionId,
        cr_signature: sigA,
      });
    expect(reg.status).toBe(400);
    expect(reg.body.code).toBe("INVALID_SIGNATURE");
  });

  it("oko_api op/api mismatch: sign_up session calling signin → INVALID_REQUEST", async () => {
    const client = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, TOKEN_A);

    const commit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_up",
      client_ephemeral_pubkey: client.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(commit.status).toBe(200);
    const okoNodePk = commit.body.data.node_pubkey;

    const sig = createRevealSignature(
      client.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      TOKEN_A,
      "sign_up",
      "signin",
    );
    const res = await request(ctx.okoApiApp)
      .post("/tss/v2/user/signin")
      .set("x-mock-user-id", "userX")
      .set("Authorization", `Bearer ${TOKEN_A}`)
      .send({
        auth_type: AUTH_TYPE,
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_REQUEST");
  });
});
