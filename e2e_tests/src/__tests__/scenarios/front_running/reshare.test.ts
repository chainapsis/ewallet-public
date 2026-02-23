import request from "supertest";
import type { AuthType } from "@oko-wallet/oko-types/auth";

import { createTestContext, type TestContext } from "@e2e/utils/test_context";
import {
  generateSessionId,
  generateClientKeypair,
  computeIdTokenHash,
  createRevealSignature,
} from "@e2e/utils/signature";

describe("e2e_test_front_running_reshare", () => {
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

  it("session hijacking: KSN reshare with different id_token than committed → INVALID_REQUEST", async () => {
    const client = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHashA = computeIdTokenHash(AUTH_TYPE, TOKEN_A);

    const commit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "reshare",
        client_ephemeral_pubkey: client.publicKey.toHex(),
        id_token_hash: idHashA,
      });
    expect(commit.status).toBe(200);

    const sig = createRevealSignature(
      client.privateKey,
      commit.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      TOKEN_B,
      "reshare",
      "reshare",
    );
    const res = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/reshare")
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
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_REQUEST");
  });

  it("replay: KSN reshare called twice → API_ALREADY_CALLED (or 400)", async () => {
    const client = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, TOKEN_A);
    const commit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "reshare",
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
      "reshare",
      "reshare",
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
      .post("/keyshare/v2/reshare")
      .set("x-mock-user-id", "userX")
      .set("Authorization", `Bearer ${TOKEN_A}`)
      .send(payload);
    expect([200, 500]).toContain(first.status); // might fail deeper due to data mismatch

    await new Promise((r) => setTimeout(r, 50));
    const second = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/reshare")
      .set("x-mock-user-id", "userX")
      .set("Authorization", `Bearer ${TOKEN_A}`)
      .send(payload);
    expect([400, 409]).toContain(second.status);
    expect(["API_ALREADY_CALLED", "INVALID_REQUEST"]).toContain(
      second.body.code,
    );
  });

  it("op/api mismatch: reshare session calling register → INVALID_REQUEST", async () => {
    const client = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, TOKEN_A);
    const commit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "reshare",
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
      "reshare",
      "register",
    );
    const res = await request(ctx.ksnApps[0])
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
        operation_type: "reshare",
        client_ephemeral_pubkey: client.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(commitA.status).toBe(200);
    const commitB = await request(ctx.ksnApps[1])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "reshare",
        client_ephemeral_pubkey: client.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(commitB.status).toBe(200);

    const sigA = createRevealSignature(
      client.privateKey,
      commitA.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      TOKEN_A,
      "reshare",
      "reshare",
    );
    const res = await request(ctx.ksnApps[1])
      .post("/keyshare/v2/reshare")
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
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_SIGNATURE");
  });
});
