import request from "supertest";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import {
  runKeygenCentralizedEd25519,
  extractKeyPackageSharesEd25519,
  sssSplitEd25519,
} from "@oko-wallet/teddsa-addon/src/server";

import { createTestContext, type TestContext } from "@e2e/utils/test_context";
import {
  generateSessionId,
  generateClientKeypair,
  computeIdTokenHash,
  createRevealSignature,
} from "@e2e/utils/signature";

describe("e2e_test_sign_up", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "new_user_123";
  const SIGNUP_ID_TOKEN = "mock_id_token_signup";
  const AUTH_TYPE: AuthType = "google";
  const TEST_SEED_SHARE = "a".repeat(64) + "b".repeat(64);

  function generateNodeIdentifier(nodeIndex: number): Uint8Array {
    const id = new Uint8Array(32);
    id[0] = nodeIndex + 10;
    return id;
  }

  function generateSecp256k1Share(nodeIndex: number): string {
    const prefix = "c";
    const nodeHex = (nodeIndex + 1).toString(16).padStart(2, "0");
    const pattern = `${prefix}${nodeHex}${prefix}`;
    return pattern.repeat(32);
  }

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    await ctx.resetAllDatabases();
  });

  it("should complete sign-up flow: commit → KSN register → oko_api keygen", async () => {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    // Centralized FROST keygen (2-of-2: client + server)
    const frostKeygen = runKeygenCentralizedEd25519();
    const clientFrostOutput = frostKeygen.keygen_outputs[0];
    const serverFrostOutput = frostKeygen.keygen_outputs[1];
    const clientKeyPackage = new Uint8Array(clientFrostOutput.key_package);
    const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);
    const ed25519PublicKey = frostKeygen.public_key;
    const ed25519PublicKeyHex = Buffer.from(ed25519PublicKey).toString("hex");
    const secp256k1PublicKey = "03" + "a".repeat(64);

    // SSS split client signing_share to 3 nodes (2-of-3)
    const signingShare = new Uint8Array(clientShares.signing_share);
    const nodeIdentifiers = [
      generateNodeIdentifier(0),
      generateNodeIdentifier(1),
      generateNodeIdentifier(2),
    ];
    const sssOutput = sssSplitEd25519(signingShare, nodeIdentifiers, 2);

    // Commit on oko_api
    const okoApiCommitRes = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(okoApiCommitRes.status).toBe(200);
    const okoApiNodePubkey = okoApiCommitRes.body.data.node_pubkey;

    // Commit + register on all KSNs
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const ksnCommitRes = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });
      expect(ksnCommitRes.status).toBe(200);
      const nodePubkey = ksnCommitRes.body.data.node_pubkey;

      // Build per-node ed25519 share from SSS output
      const keyPackageBytes = new Uint8Array(
        sssOutput.key_packages[i].key_package,
      );
      const shares = extractKeyPackageSharesEd25519(keyPackageBytes);
      const ed25519Share =
        Buffer.from(shares.signing_share).toString("hex") +
        Buffer.from(shares.verifying_share).toString("hex");

      const registerSignature = createRevealSignature(
        clientKeypair.privateKey,
        nodePubkey,
        sessionId,
        AUTH_TYPE,
        SIGNUP_ID_TOKEN,
        "sign_up",
        "register",
      );

      const registerRes = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: secp256k1PublicKey,
              share: generateSecp256k1Share(i),
            },
            ed25519: {
              public_key: ed25519PublicKeyHex,
              share: ed25519Share,
              seed_share: TEST_SEED_SHARE,
            },
          },
          cr_session_id: sessionId,
          cr_signature: registerSignature,
        });
      expect(registerRes.status).toBe(200);
    }

    // Keygen on oko_api
    const keygenSignature = createRevealSignature(
      clientKeypair.privateKey,
      okoApiNodePubkey,
      sessionId,
      AUTH_TYPE,
      SIGNUP_ID_TOKEN,
      "sign_up",
      "keygen",
    );

    const keygenRes = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2_secp256k1: {
          public_key: secp256k1PublicKey,
          private_share: "e".repeat(64),
        },
        keygen_2_ed25519: {
          key_package: serverFrostOutput.key_package,
          public_key_package: Buffer.from(
            serverFrostOutput.public_key_package,
          ).toString("hex"),
          identifier: serverFrostOutput.identifier,
          public_key: ed25519PublicKey,
        },
        ed25519_seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId,
        cr_signature: keygenSignature,
      });
    expect(keygenRes.status).toBe(200);
    expect(keygenRes.body.success).toBe(true);

    // Verify seed_share was stored on KSN via get_key_shares (needs sign_in session)
    const VERIFY_ID_TOKEN = "mock_id_token_verify";
    const verifyKeypair = generateClientKeypair();
    const verifySessionId = generateSessionId();
    const verifyIdHash = computeIdTokenHash(AUTH_TYPE, VERIFY_ID_TOKEN);

    const ksnVerifyCommit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: verifySessionId,
        operation_type: "sign_in",
        client_ephemeral_pubkey: verifyKeypair.publicKey.toHex(),
        id_token_hash: verifyIdHash,
      });
    expect(ksnVerifyCommit.status).toBe(200);

    const getSharesSig = createRevealSignature(
      verifyKeypair.privateKey,
      ksnVerifyCommit.body.data.node_pubkey,
      verifySessionId,
      AUTH_TYPE,
      VERIFY_ID_TOKEN,
      "sign_in",
      "get_key_shares",
    );

    const getSharesRes = await request(ctx.ksnApps[0])
      .post("/keyshare/v2")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${VERIFY_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: secp256k1PublicKey,
          ed25519: ed25519PublicKeyHex,
        },
        cr_session_id: verifySessionId,
        cr_signature: getSharesSig,
      });
    expect(getSharesRes.status).toBe(200);
    expect(getSharesRes.body.data.ed25519).toBeDefined();
    expect(getSharesRes.body.data.ed25519.seed_share).toBe(TEST_SEED_SHARE);
  });

  it("should reject duplicate commit for same session_id", async () => {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    const commitRes1 = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(commitRes1.status).toBe(200);

    const commitRes2 = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(commitRes2.status).toBe(409);
    expect(commitRes2.body.code).toBe("SESSION_ALREADY_EXISTS");
  });

  it("should reject KSN register without commit on that node (SESSION_NOT_FOUND)", async () => {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    // Commit to oko_api
    const okoApiCommitRes = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(okoApiCommitRes.status).toBe(200);

    // Commit to KSN[0] only, but attempt register on KSN[1]
    const ksnCommitRes = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(ksnCommitRes.status).toBe(200);

    // Try register on KSN[1] which has no session
    const registerSignature = createRevealSignature(
      clientKeypair.privateKey,
      ksnCommitRes.body.data.node_pubkey, // use some pubkey; session won't be found anyway
      sessionId,
      AUTH_TYPE,
      SIGNUP_ID_TOKEN,
      "sign_up",
      "register",
    );

    const registerRes = await request(ctx.ksnApps[1])
      .post("/keyshare/v2/register")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: {
            public_key: "03" + "a".repeat(64),
            share: "c1".repeat(64),
          },
          ed25519: { public_key: "b".repeat(64), share: "d1".repeat(64), seed_share: TEST_SEED_SHARE },
        },
        cr_session_id: sessionId,
        cr_signature: registerSignature,
      });
    expect(registerRes.status).toBe(404);
    expect(registerRes.body.code).toBe("SESSION_NOT_FOUND");
  });

  it("should reject KSN register with invalid signature", async () => {
    const clientKeypair = generateClientKeypair();
    const wrongKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    const okoApiCommitRes = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(okoApiCommitRes.status).toBe(200);

    const ksnCommitRes = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(ksnCommitRes.status).toBe(200);

    const badSignature = createRevealSignature(
      wrongKeypair.privateKey,
      ksnCommitRes.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNUP_ID_TOKEN,
      "sign_up",
      "register",
    );

    const registerRes = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: {
            public_key: "03" + "a".repeat(64),
            share: "c1".repeat(64),
          },
          ed25519: { public_key: "b".repeat(64), share: "d1".repeat(64), seed_share: TEST_SEED_SHARE },
        },
        cr_session_id: sessionId,
        cr_signature: badSignature,
      });
    expect(registerRes.status).toBe(400);
    expect(registerRes.body.code).toBe("INVALID_SIGNATURE");
  });

  it("should reject KSN register with INVALID_REQUEST when ed25519 wallet is missing", async () => {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    const okoApiCommitRes = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(okoApiCommitRes.status).toBe(200);

    const ksnCommitRes = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(ksnCommitRes.status).toBe(200);

    const signature = createRevealSignature(
      clientKeypair.privateKey,
      ksnCommitRes.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNUP_ID_TOKEN,
      "sign_up",
      "register",
    );

    const registerRes = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/register")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: {
            public_key: "03" + "a".repeat(64),
            share: "c1".repeat(64),
          },
          // ed25519 missing
        },
        cr_session_id: sessionId,
        cr_signature: signature,
      });
    expect(registerRes.status).toBe(400);
    expect(registerRes.body.code).toBe("INVALID_REQUEST");
  });

  it("should reject oko_api keygen when operation_type mismatches", async () => {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    const commitRes = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_in", // wrong op
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idTokenHash,
    });
    expect(commitRes.status).toBe(200);
    const nodePubkey = commitRes.body.data.node_pubkey;

    const keygenSignature = createRevealSignature(
      clientKeypair.privateKey,
      nodePubkey,
      sessionId,
      AUTH_TYPE,
      SIGNUP_ID_TOKEN,
      "sign_up",
      "keygen",
    );
    const res = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2_secp256k1: {
          public_key: "03" + "a".repeat(64),
          private_share: "e".repeat(64),
        },
        keygen_2_ed25519: {
          key_package: new Uint8Array(64),
          public_key_package: "",
          identifier: new Uint8Array(32),
          public_key: new Uint8Array(32),
        },
        ed25519_seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId,
        cr_signature: keygenSignature,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_REQUEST");
  });

  it("should reject oko_api keygen if KSN registration not done (KEYSHARE_NODE_INSUFFICIENT)", async () => {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    const frostKeygen = runKeygenCentralizedEd25519();
    const serverFrostOutput = frostKeygen.keygen_outputs[1];
    const ed25519PublicKey = frostKeygen.public_key;
    const ed25519PublicKeyHex = Buffer.from(ed25519PublicKey).toString("hex");
    const secp256k1PublicKey = "03" + "a".repeat(64);

    const commitRes = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_up",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idTokenHash,
    });
    expect(commitRes.status).toBe(200);
    const nodePubkey = commitRes.body.data.node_pubkey;

    const keygenSignature = createRevealSignature(
      clientKeypair.privateKey,
      nodePubkey,
      sessionId,
      AUTH_TYPE,
      SIGNUP_ID_TOKEN,
      "sign_up",
      "keygen",
    );
    const res = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2_secp256k1: {
          public_key: secp256k1PublicKey,
          private_share: "e".repeat(64),
        },
        keygen_2_ed25519: {
          key_package: serverFrostOutput.key_package,
          public_key_package: Buffer.from(
            serverFrostOutput.public_key_package,
          ).toString("hex"),
          identifier: serverFrostOutput.identifier,
          public_key: ed25519PublicKey,
        },
        ed25519_seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId,
        cr_signature: keygenSignature,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
  });

  it("should reject oko_api keygen with invalid signature", async () => {
    const clientKeypair = generateClientKeypair();
    const wrongKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    const frostKeygen = runKeygenCentralizedEd25519();
    const serverFrostOutput = frostKeygen.keygen_outputs[1];

    const commitRes = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_up",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idTokenHash,
    });
    expect(commitRes.status).toBe(200);
    const nodePubkey = commitRes.body.data.node_pubkey;

    const wrongSignature = createRevealSignature(
      wrongKeypair.privateKey,
      nodePubkey,
      sessionId,
      AUTH_TYPE,
      SIGNUP_ID_TOKEN,
      "sign_up",
      "keygen",
    );
    const res = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2_secp256k1: {
          public_key: "03" + "a".repeat(64),
          private_share: "e".repeat(64),
        },
        keygen_2_ed25519: {
          key_package: serverFrostOutput.key_package,
          public_key_package: Buffer.from(
            serverFrostOutput.public_key_package,
          ).toString("hex"),
          identifier: serverFrostOutput.identifier,
          public_key: frostKeygen.public_key,
        },
        ed25519_seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId,
        cr_signature: wrongSignature,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_SIGNATURE");
  });

  it("should reject oko_api keygen with duplicate public key after first success", async () => {
    // First, perform full sign-up to create wallets
    const user1 = TEST_USER_ID;
    const idToken1 = SIGNUP_ID_TOKEN;

    const clientKeypair1 = generateClientKeypair();
    const sessionId1 = generateSessionId();
    const idTokenHash1 = computeIdTokenHash(AUTH_TYPE, idToken1);

    const frostKeygen1 = runKeygenCentralizedEd25519();
    const clientOut1 = frostKeygen1.keygen_outputs[0];
    const serverOut1 = frostKeygen1.keygen_outputs[1];
    const clientKP1 = new Uint8Array(clientOut1.key_package);
    const shares1 = extractKeyPackageSharesEd25519(clientKP1);
    const edPk1 = frostKeygen1.public_key;
    const edPkHex1 = Buffer.from(edPk1).toString("hex");
    const secpPk1 = "03" + "a".repeat(64);

    const nodeIds = [0, 1, 2].map((i) => {
      const id = new Uint8Array(32);
      id[0] = i + 10;
      return id;
    });
    const sss1 = sssSplitEd25519(
      new Uint8Array(shares1.signing_share),
      nodeIds,
      2,
    );

    const okoCommit1 = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: sessionId1,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair1.publicKey.toHex(),
        id_token_hash: idTokenHash1,
      });
    expect(okoCommit1.status).toBe(200);
    const okoNodePk1 = okoCommit1.body.data.node_pubkey;

    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId1,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair1.publicKey.toHex(),
          id_token_hash: idTokenHash1,
        });
      expect(ksnCommit.status).toBe(200);
      const regSig = createRevealSignature(
        clientKeypair1.privateKey,
        ksnCommit.body.data.node_pubkey,
        sessionId1,
        AUTH_TYPE,
        idToken1,
        "sign_up",
        "register",
      );

      const kpBytes = new Uint8Array(sss1.key_packages[i].key_package);
      const sh = extractKeyPackageSharesEd25519(kpBytes);
      const edShare =
        Buffer.from(sh.signing_share).toString("hex") +
        Buffer.from(sh.verifying_share).toString("hex");

      const reg = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", user1)
        .set("Authorization", `Bearer ${idToken1}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: secpPk1,
              share: generateSecp256k1Share(i),
            },
            ed25519: { public_key: edPkHex1, share: edShare, seed_share: TEST_SEED_SHARE },
          },
          cr_session_id: sessionId1,
          cr_signature: regSig,
        });
      expect(reg.status).toBe(200);
    }

    const kgSig1 = createRevealSignature(
      clientKeypair1.privateKey,
      okoNodePk1,
      sessionId1,
      AUTH_TYPE,
      idToken1,
      "sign_up",
      "keygen",
    );
    const kg1 = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", user1)
      .set("Authorization", `Bearer ${idToken1}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2_secp256k1: {
          public_key: secpPk1,
          private_share: "e".repeat(64),
        },
        keygen_2_ed25519: {
          key_package: serverOut1.key_package,
          public_key_package: Buffer.from(
            serverOut1.public_key_package,
          ).toString("hex"),
          identifier: serverOut1.identifier,
          public_key: edPk1,
        },
        ed25519_seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId1,
        cr_signature: kgSig1,
      });
    expect(kg1.status).toBe(200);

    // Second user tries to keygen with same public keys → DUPLICATE_PUBLIC_KEY
    const user2 = "another_user";
    const idToken2 = "mock_id_token_signup_2";
    const clientKeypair2 = generateClientKeypair();
    const sessionId2 = generateSessionId();
    const idTokenHash2 = computeIdTokenHash(AUTH_TYPE, idToken2);
    const okoCommit2 = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: sessionId2,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair2.publicKey.toHex(),
        id_token_hash: idTokenHash2,
      });
    expect(okoCommit2.status).toBe(200);
    const okoNodePk2 = okoCommit2.body.data.node_pubkey;

    const kgSig2 = createRevealSignature(
      clientKeypair2.privateKey,
      okoNodePk2,
      sessionId2,
      AUTH_TYPE,
      idToken2,
      "sign_up",
      "keygen",
    );
    const kg2 = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", user2)
      .set("Authorization", `Bearer ${idToken2}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2_secp256k1: {
          public_key: secpPk1,
          private_share: "e".repeat(64),
        },
        keygen_2_ed25519: {
          key_package: serverOut1.key_package,
          public_key_package: Buffer.from(
            serverOut1.public_key_package,
          ).toString("hex"),
          identifier: serverOut1.identifier,
          public_key: edPk1,
        },
        ed25519_seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId2,
        cr_signature: kgSig2,
      });
    expect(kg2.status).toBe(409);
    expect(kg2.body.code).toBe("DUPLICATE_PUBLIC_KEY");
  });
});
