import request from "supertest";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { runKeygenCentralizedEd25519 } from "@oko-wallet/teddsa-addon/src/server";

import { createTestContext, type TestContext } from "@e2e/utils/test_context";
import {
  generateSessionId,
  generateClientKeypair,
  computeIdTokenHash,
  createRevealSignature,
} from "@e2e/utils/signature";

describe("e2e_test_add_ed25519", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "legacy_user_123";
  const SIGNUP_ID_TOKEN = "mock_id_token_signup";
  const SIGNIN_ID_TOKEN = "mock_id_token_signin";
  const AUTH_TYPE: AuthType = "google";
  const TEST_SEED_SHARE = "a".repeat(64) + "b".repeat(64);

  let secp256k1PublicKey: string;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  function generateSecp256k1Share(nodeIndex: number): string {
    const prefix = "c";
    const nodeHex = (nodeIndex + 1).toString(16).padStart(2, "0");
    const pattern = `${prefix}${nodeHex}${prefix}`;
    return pattern.repeat(32);
  }

  async function prepareSecpOnlyUser(): Promise<void> {
    await ctx.resetAllDatabases();

    // Prepare secp public key and shares
    secp256k1PublicKey = "03" + "a".repeat(64);

    // Register secp shares to all KSN nodes via v1 register
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const reg = await request(ctx.ksnApps[i])
        .post("/keyshare/v1/register")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          curve_type: "secp256k1",
          public_key: secp256k1PublicKey,
          share: generateSecp256k1Share(i),
        });
      expect(reg.status).toBe(200);
    }

    // Create secp wallet on oko_api via v1 keygen
    const kg = await request(ctx.okoApiApp)
      .post("/tss/v1/keygen")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2: {
          public_key: secp256k1PublicKey,
          private_share: "e".repeat(64),
        },
      });
    expect(kg.status).toBe(200);
  }

  it("should add ed25519 for a user with only secp256k1 (register_ed25519 → keygen_ed25519)", async () => {
    await prepareSecpOnlyUser();

    // ed25519 keygen+split
    const edKeygen = runKeygenCentralizedEd25519();
    const edKeygen2 = edKeygen.keygen_outputs[1];
    const edPkHex = Buffer.from(edKeygen.public_key).toString("hex");

    // Commit oko_api and KSN for add_ed25519
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "add_ed25519",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);

    const ksnNodePubkeys: string[] = [];
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "add_ed25519",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idHash,
        });
      expect(ksnCommit.status).toBe(200);
      ksnNodePubkeys.push(ksnCommit.body.data.node_pubkey);

      const commitSig = createRevealSignature(
        clientKeypair.privateKey,
        ksnCommit.body.data.node_pubkey,
        sessionId,
        AUTH_TYPE,
        SIGNIN_ID_TOKEN,
        "add_ed25519",
        "register_ed25519",
      );

      const reg = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register/ed25519")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          public_key: edPkHex,
          // Use deterministic 64-byte share hex for tests
          share: (i === 0 ? "aa" : i === 1 ? "bb" : "cc").repeat(64),
          seed_share: TEST_SEED_SHARE,
          cr_session_id: sessionId,
          cr_signature: commitSig,
        });
      expect(reg.status).toBe(200);
    }

    // oko_api keygen/ed25519
    const okoNodePk = okoCommit.body.data.node_pubkey;
    const kgSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519",
      "keygen_ed25519",
    );
    const keygen = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen_ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2: {
          key_package: edKeygen2.key_package,
          public_key_package: Buffer.from(
            edKeygen2.public_key_package,
          ).toString("hex"),
          identifier: edKeygen2.identifier,
          public_key: edKeygen.public_key,
          seed_share: TEST_SEED_SHARE,
        },
        cr_session_id: sessionId,
        cr_signature: kgSig,
      });
    expect(keygen.status).toBe(200);
    expect(keygen.body.success).toBe(true);

    // Verify seed_share stored on KSN[0] via get_key_shares (allowed in add_ed25519 session)
    const getSharesSig = createRevealSignature(
      clientKeypair.privateKey,
      ksnNodePubkeys[0],
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519",
      "get_key_shares",
    );

    const getSharesRes = await request(ctx.ksnApps[0])
      .post("/keyshare/v2")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: { ed25519: edPkHex },
        cr_session_id: sessionId,
        cr_signature: getSharesSig,
      });
    expect(getSharesRes.status).toBe(200);
    expect(getSharesRes.body.data.ed25519).toBeDefined();
    expect(getSharesRes.body.data.ed25519.seed_share).toBe(TEST_SEED_SHARE);
  });

  it("should reject register_ed25519 without commit on that node (SESSION_NOT_FOUND)", async () => {
    await prepareSecpOnlyUser();
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    // oko_api commit only
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "add_ed25519",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);

    const ed = runKeygenCentralizedEd25519();
    const edPkHex = Buffer.from(ed.public_key).toString("hex");
    const sig = createRevealSignature(
      clientKeypair.privateKey,
      okoCommit.body.data.node_pubkey, // wrong node, but session will be missing on KSN
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519",
      "register_ed25519",
    );
    const reg = await request(ctx.ksnApps[1])
      .post("/keyshare/v2/register/ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        public_key: edPkHex,
        share: "aa".repeat(64),
        seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(reg.status).toBe(404);
    expect(reg.body.code).toBe("SESSION_NOT_FOUND");
  });

  it("should reject keygen_ed25519 with invalid signature", async () => {
    await prepareSecpOnlyUser();
    const clientKeypair = generateClientKeypair();
    const wrongKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "add_ed25519",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    const ed = runKeygenCentralizedEd25519();
    const badSig = createRevealSignature(
      wrongKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519",
      "keygen_ed25519",
    );
    const res = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen_ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2: {
          key_package: ed.keygen_outputs[1].key_package,
          public_key_package: Buffer.from(
            ed.keygen_outputs[1].public_key_package,
          ).toString("hex"),
          identifier: ed.keygen_outputs[1].identifier,
          public_key: ed.public_key,
          seed_share: TEST_SEED_SHARE,
        },
        cr_session_id: sessionId,
        cr_signature: badSig,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_SIGNATURE");
  });

  it("should reject register_ed25519 with invalid signature", async () => {
    await prepareSecpOnlyUser();
    const clientKeypair = generateClientKeypair();
    const wrongKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const ksnCommit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "add_ed25519",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(ksnCommit.status).toBe(200);

    const ed = runKeygenCentralizedEd25519();
    const edPkHex = Buffer.from(ed.public_key).toString("hex");
    const badSig = createRevealSignature(
      wrongKeypair.privateKey,
      ksnCommit.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519",
      "register_ed25519",
    );
    const reg = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register/ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        public_key: edPkHex,
        share: "aa".repeat(64),
        seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId,
        cr_signature: badSig,
      });
    expect(reg.status).toBe(400);
    expect(reg.body.code).toBe("INVALID_SIGNATURE");
  });

  it("should reject register_ed25519 replay (API_ALREADY_CALLED)", async () => {
    await prepareSecpOnlyUser();
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const ksnCommit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "add_ed25519",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(ksnCommit.status).toBe(200);
    const nodePk = ksnCommit.body.data.node_pubkey;

    const ed = runKeygenCentralizedEd25519();
    const edPkHex = Buffer.from(ed.public_key).toString("hex");
    const sig = createRevealSignature(
      clientKeypair.privateKey,
      nodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519",
      "register_ed25519",
    );
    const payload = {
      auth_type: AUTH_TYPE,
      public_key: edPkHex,
      share: "aa".repeat(64),
      seed_share: TEST_SEED_SHARE,
      cr_session_id: sessionId,
      cr_signature: sig,
    };
    const first = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register/ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send(payload);
    expect(first.status).toBe(200);

    const second = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register/ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send(payload);
    expect([400, 409]).toContain(second.status);
    if (second.status === 409) {
      expect(second.body.code).toBe("API_ALREADY_CALLED");
    } else {
      expect(second.body.code).toBe("INVALID_REQUEST");
    }
  });

  it("should reject keygen_ed25519 when secp256k1 wallet is missing", async () => {
    await ctx.resetAllDatabases();
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "add_ed25519",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    const ed = runKeygenCentralizedEd25519();
    const sig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519",
      "keygen_ed25519",
    );
    const res = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen_ed25519")
      .set("x-mock-user-id", "nouser")
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2: {
          key_package: ed.keygen_outputs[1].key_package,
          public_key_package: Buffer.from(
            ed.keygen_outputs[1].public_key_package,
          ).toString("hex"),
          identifier: ed.keygen_outputs[1].identifier,
          public_key: ed.public_key,
          seed_share: TEST_SEED_SHARE,
        },
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    // user not found in this simple path
    expect([404, 400]).toContain(res.status);
  });

  it("should reject keygen_ed25519 when called twice in same session (API_ALREADY_CALLED) and in new session (WALLET_ALREADY_EXISTS)", async () => {
    await prepareSecpOnlyUser();

    // First success: register ed25519 on KSNs + keygen_ed25519
    const edKeygen = runKeygenCentralizedEd25519();
    const edKeygen1 = edKeygen.keygen_outputs[0];
    const edKeygen2 = edKeygen.keygen_outputs[1];
    const edPkHex = Buffer.from(edKeygen.public_key).toString("hex");

    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "add_ed25519",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "add_ed25519",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idHash,
        });
      expect(ksnCommit.status).toBe(200);
      const regSig = createRevealSignature(
        clientKeypair.privateKey,
        ksnCommit.body.data.node_pubkey,
        sessionId,
        AUTH_TYPE,
        SIGNIN_ID_TOKEN,
        "add_ed25519",
        "register_ed25519",
      );
      const reg = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register/ed25519")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          public_key: edPkHex,
          share: (i === 0 ? "aa" : i === 1 ? "bb" : "cc").repeat(64),
          seed_share: TEST_SEED_SHARE,
          cr_session_id: sessionId,
          cr_signature: regSig,
        });
      expect(reg.status).toBe(200);
    }
    const kgSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519",
      "keygen_ed25519",
    );
    const first = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen_ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2: {
          key_package: edKeygen2.key_package,
          public_key_package: Buffer.from(
            edKeygen2.public_key_package,
          ).toString("hex"),
          identifier: edKeygen2.identifier,
          public_key: edKeygen.public_key,
          seed_share: TEST_SEED_SHARE,
        },
        cr_session_id: sessionId,
        cr_signature: kgSig,
      });
    expect(first.status).toBe(200);

    // Wait briefly to ensure middleware's finish-hook persisted API call
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Second call (same session) should be blocked by commit-reveal middleware
    const second = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen_ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2: {
          key_package: edKeygen2.key_package,
          public_key_package: Buffer.from(
            edKeygen2.public_key_package,
          ).toString("hex"),
          identifier: edKeygen2.identifier,
          public_key: edKeygen.public_key,
          seed_share: TEST_SEED_SHARE,
        },
        cr_session_id: sessionId,
        cr_signature: kgSig,
      });
    expect([400, 409]).toContain(second.status);
    if (second.status === 409) {
      expect(second.body.code).toBe("API_ALREADY_CALLED");
    } else {
      expect(second.body.code).toBe("INVALID_REQUEST");
    }

    // New session: business logic should detect wallet already exists
    const clientKeypair2 = generateClientKeypair();
    const newSessionId = generateSessionId();
    const NEW_SIGNIN_ID_TOKEN = `${SIGNIN_ID_TOKEN}_2`;
    const newIdHash = computeIdTokenHash(AUTH_TYPE, NEW_SIGNIN_ID_TOKEN);
    const okoCommit2 = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: newSessionId,
        operation_type: "add_ed25519",
        client_ephemeral_pubkey: clientKeypair2.publicKey.toHex(),
        id_token_hash: newIdHash,
      });
    expect(okoCommit2.status).toBe(200);

    const kgSig2 = createRevealSignature(
      clientKeypair2.privateKey,
      okoCommit2.body.data.node_pubkey,
      newSessionId,
      AUTH_TYPE,
      NEW_SIGNIN_ID_TOKEN,
      "add_ed25519",
      "keygen_ed25519",
    );
    const third = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen_ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${NEW_SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2: {
          key_package: edKeygen2.key_package,
          public_key_package: Buffer.from(
            edKeygen2.public_key_package,
          ).toString("hex"),
          identifier: edKeygen2.identifier,
          public_key: edKeygen.public_key,
          seed_share: TEST_SEED_SHARE,
        },
        cr_session_id: newSessionId,
        cr_signature: kgSig2,
      });
    expect(third.status).toBe(409);
    expect(third.body.code).toBe("WALLET_ALREADY_EXISTS");
  });
});
