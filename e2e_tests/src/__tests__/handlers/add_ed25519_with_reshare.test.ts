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

describe("e2e_test_add_ed25519_with_reshare", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "legacy_user_add_and_reshare";
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

  it("should register ed25519 then reshare upsert for both wallets, then keygen_ed25519 and oko_api reshare", async () => {
    await prepareSecpOnlyUser();

    // ed25519 keygen
    const edKeygen = runKeygenCentralizedEd25519();
    const edKeygen1 = edKeygen.keygen_outputs[0];
    const edKeygen2 = edKeygen.keygen_outputs[1];
    const edPkHex = Buffer.from(edKeygen.public_key).toString("hex");

    // Commit oko_api (add_ed25519_with_reshare)
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "add_ed25519_with_reshare",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    // Commit all KSN nodes (add_ed25519_with_reshare)
    const nodePubkeys: string[] = [];
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "add_ed25519_with_reshare",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idHash,
        });
      expect(ksnCommit.status).toBe(200);
      nodePubkeys.push(ksnCommit.body.data.node_pubkey);
    }

    // Note: sign-in API requires both wallets; user currently has only secp256k1.
    // Skip oko_api signin here and proceed with KSN register/ed25519 + reshare upsert.

    // Register ed25519 to all nodes (acts as ACTIVE nodes)
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const regSig = createRevealSignature(
        clientKeypair.privateKey,
        nodePubkeys[i],
        sessionId,
        AUTH_TYPE,
        SIGNIN_ID_TOKEN,
        "add_ed25519_with_reshare",
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

    // Reshare to all nodes (upsert for ed25519, validate+update for secp256k1)
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const reshareSig = createRevealSignature(
        clientKeypair.privateKey,
        nodePubkeys[i],
        sessionId,
        AUTH_TYPE,
        SIGNIN_ID_TOKEN,
        "add_ed25519_with_reshare",
        "reshare",
      );
      const res = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/reshare")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: secp256k1PublicKey,
              share: generateSecp256k1Share(i),
            },
            ed25519: {
              public_key: edPkHex,
              share: (i === 0 ? "aa" : i === 1 ? "bb" : "cc").repeat(64),
              seed_share: TEST_SEED_SHARE,
            },
          },
          cr_session_id: sessionId,
          cr_signature: reshareSig,
        });
      expect(res.status).toBe(200);
    }

    // oko_api keygen_ed25519
    const keygenSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519_with_reshare",
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
        cr_signature: keygenSig,
      });
    expect(keygen.status).toBe(200);

    // oko_api user/reshare final
    const reshareFinalSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519_with_reshare",
      "reshare",
    );
    const resharedNodes = ctx.ksnUrls.map((url, i) => ({
      name: `test_node_${i + 1}`,
      endpoint: url,
    }));
    const update = await request(ctx.okoApiApp)
      .post("/tss/v2/user/reshare")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        secp256k1_public_key: secp256k1PublicKey,
        ed25519_public_key: edPkHex,
        reshared_key_shares: resharedNodes,
        cr_session_id: sessionId,
        cr_signature: reshareFinalSig,
      });
    if (update.status !== 200) {
      // eslint-disable-next-line no-console
      console.log("user/reshare response:", update.body);
    }
    expect(update.status).toBe(200);
  });

  it("should fail register_ed25519 with invalid signature and replay on same node", async () => {
    await prepareSecpOnlyUser();

    const edKeygen = runKeygenCentralizedEd25519();
    const edPkHex = Buffer.from(edKeygen.public_key).toString("hex");

    const clientKeypair = generateClientKeypair();
    const wrongKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    // Commit oko_api and KSN node 0
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "add_ed25519_with_reshare",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);
    const ksnCommit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "add_ed25519_with_reshare",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(ksnCommit.status).toBe(200);

    // Invalid signature
    const badSig = createRevealSignature(
      wrongKeypair.privateKey,
      ksnCommit.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519_with_reshare",
      "register_ed25519",
    );
    const regBad = await request(ctx.ksnApps[0])
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
    expect(regBad.status).toBe(400);
    expect(regBad.body.code).toBe("INVALID_SIGNATURE");

    // Valid signature
    const goodSig = createRevealSignature(
      clientKeypair.privateKey,
      ksnCommit.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519_with_reshare",
      "register_ed25519",
    );
    const reg1 = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register/ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        public_key: edPkHex,
        share: "aa".repeat(64),
        seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId,
        cr_signature: goodSig,
      });
    expect(reg1.status).toBe(200);

    // Wait briefly to ensure middleware recorded API call
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Replay with same payload
    const reg2 = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register/ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        public_key: edPkHex,
        share: "aa".repeat(64),
        seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId,
        cr_signature: goodSig,
      });
    expect(reg2.status).toBe(409);
    expect(reg2.body.code).toBe("API_ALREADY_CALLED");
  });

  it("should fail reshare with missing ed25519, share mismatch, and invalid signature", async () => {
    await prepareSecpOnlyUser();

    const edKeygen = runKeygenCentralizedEd25519();
    const edPkHex = Buffer.from(edKeygen.public_key).toString("hex");
    // Pre-register ed25519 to node 0 as ACTIVE
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "add_ed25519_with_reshare",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);
    const ksnCommit0 = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "add_ed25519_with_reshare",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(ksnCommit0.status).toBe(200);
    const regSig0 = createRevealSignature(
      clientKeypair.privateKey,
      ksnCommit0.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519_with_reshare",
      "register_ed25519",
    );
    const reg0 = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register/ed25519")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        public_key: edPkHex,
        share: "aa".repeat(64),
        seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId,
        cr_signature: regSig0,
      });
    expect(reg0.status).toBe(200);

    // 1) Missing ed25519 wallet
    const sig0 = createRevealSignature(
      clientKeypair.privateKey,
      ksnCommit0.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519_with_reshare",
      "reshare",
    );
    const miss = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/reshare")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: {
            public_key: secp256k1PublicKey,
            share: generateSecp256k1Share(0),
          },
        },
        cr_session_id: sessionId,
        cr_signature: sig0,
      });
    expect(miss.status).toBe(400);
    expect(miss.body.code).toBe("INVALID_REQUEST");

    // 2) Share mismatch
    const mismatch = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/reshare")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: { public_key: secp256k1PublicKey, share: "ff".repeat(64) },
          ed25519: { public_key: edPkHex, share: "aa".repeat(64), seed_share: TEST_SEED_SHARE },
        },
        cr_session_id: sessionId,
        cr_signature: sig0,
      });
    expect(mismatch.status).toBe(500);
    expect(mismatch.body.code).toBe("RESHARE_FAILED");

    // 3) Invalid signature
    const wrong = generateClientKeypair();
    const badSig = createRevealSignature(
      wrong.privateKey,
      ksnCommit0.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519_with_reshare",
      "reshare",
    );
    const bad = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/reshare")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: {
            public_key: secp256k1PublicKey,
            share: generateSecp256k1Share(0),
          },
          ed25519: { public_key: edPkHex, share: "aa".repeat(64), seed_share: TEST_SEED_SHARE },
        },
        cr_session_id: sessionId,
        cr_signature: badSig,
      });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe("INVALID_SIGNATURE");
  });

  it("should fail oko_api user/reshare with unknown nodes (KS_NODE_NOT_FOUND)", async () => {
    await prepareSecpOnlyUser();
    const edKeygen = runKeygenCentralizedEd25519();
    const edKeygen2 = edKeygen.keygen_outputs[1];
    const edPkHex = Buffer.from(edKeygen.public_key).toString("hex");

    // Minimal add_ed25519 end state: commit + register_ed25519 on KSN + keygen_ed25519 on oko_api
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "add_ed25519_with_reshare",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const c = await request(ctx.ksnApps[i]).post("/keyshare/v2/commit").send({
        session_id: sessionId,
        operation_type: "add_ed25519_with_reshare",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idHash,
      });
      expect(c.status).toBe(200);
      const rSig = createRevealSignature(
        clientKeypair.privateKey,
        c.body.data.node_pubkey,
        sessionId,
        AUTH_TYPE,
        SIGNIN_ID_TOKEN,
        "add_ed25519_with_reshare",
        "register_ed25519",
      );
      const r = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register/ed25519")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          public_key: Buffer.from(edKeygen.public_key).toString("hex"),
          share: (i === 0 ? "aa" : i === 1 ? "bb" : "cc").repeat(64),
          seed_share: TEST_SEED_SHARE,
          cr_session_id: sessionId,
          cr_signature: rSig,
        });
      expect(r.status).toBe(200);
    }
    const keygenSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519_with_reshare",
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
        cr_signature: keygenSig,
      });
    expect(keygen.status).toBe(200);

    // oko_api user/reshare with unknown node endpoint
    const reshareSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "add_ed25519_with_reshare",
      "reshare",
    );
    const update = await request(ctx.okoApiApp)
      .post("/tss/v2/user/reshare")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        secp256k1_public_key: secp256k1PublicKey,
        ed25519_public_key: edPkHex,
        reshared_key_shares: [
          { name: "unknown", endpoint: "http://localhost:9999" },
        ],
        cr_session_id: sessionId,
        cr_signature: reshareSig,
      });
    expect(update.status).toBe(404);
    expect(update.body.code).toBe("KS_NODE_NOT_FOUND");
  });
});
