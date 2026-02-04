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

describe("e2e_test_sign_in", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "existing_user_123";
  const SIGNUP_ID_TOKEN = "mock_id_token_signup";
  const SIGNIN_ID_TOKEN = "mock_id_token_signin";
  const AUTH_TYPE: AuthType = "google";

  let registeredSecp256k1PublicKey: string;
  let registeredEd25519PublicKeyHex: string;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

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

  async function createExistingUser(
    userId: string,
    idToken: string,
  ): Promise<{
    secp256k1PublicKey: string;
    ed25519PublicKeyHex: string;
  }> {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, idToken);

    // Generate FROST 2-of-2 keys (client + server)
    const frostKeygen = runKeygenCentralizedEd25519();
    const clientFrostOutput = frostKeygen.keygen_outputs[0];
    const serverFrostOutput = frostKeygen.keygen_outputs[1];
    const clientKeyPackage = new Uint8Array(clientFrostOutput.key_package);
    const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);
    const ed25519PublicKey = frostKeygen.public_key;
    const ed25519PublicKeyHex = Buffer.from(ed25519PublicKey).toString("hex");
    const secp256k1PublicKey = "03" + "a".repeat(64);

    // Use REAL SSS split to generate shares for 3 KS nodes
    const signingShare = new Uint8Array(clientShares.signing_share);
    const nodeIdentifiers = [
      generateNodeIdentifier(0),
      generateNodeIdentifier(1),
      generateNodeIdentifier(2),
    ];

    const sssOutput = sssSplitEd25519(signingShare, nodeIdentifiers, 2);

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
    const okoApiNodePubkey = okoApiCommitRes.body.data.node_pubkey;

    // Commit and register to all KS nodes with unique shares per node
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

      const kpBytes = new Uint8Array(sssOutput.key_packages[i].key_package);
      const shares = extractKeyPackageSharesEd25519(kpBytes);
      const ed25519Share =
        Buffer.from(shares.signing_share).toString("hex") +
        Buffer.from(shares.verifying_share).toString("hex");

      const registerSignature = createRevealSignature(
        clientKeypair.privateKey,
        ksnCommitRes.body.data.node_pubkey,
        sessionId,
        AUTH_TYPE,
        idToken,
        "sign_up",
        "register",
      );

      const registerRes = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", userId)
        .set("Authorization", `Bearer ${idToken}`)
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
            },
          },
          cr_session_id: sessionId,
          cr_signature: registerSignature,
        });
      expect(registerRes.status).toBe(200);
    }

    // Keygen to oko_api
    const keygenSignature = createRevealSignature(
      clientKeypair.privateKey,
      okoApiNodePubkey,
      sessionId,
      AUTH_TYPE,
      idToken,
      "sign_up",
      "keygen",
    );

    const keygenRes = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", userId)
      .set("Authorization", `Bearer ${idToken}`)
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
        cr_session_id: sessionId,
        cr_signature: keygenSignature,
      });
    expect(keygenRes.status).toBe(200);

    return {
      secp256k1PublicKey,
      ed25519PublicKeyHex,
    };
  }

  beforeEach(async () => {
    await ctx.resetAllDatabases();
    const res = await createExistingUser(TEST_USER_ID, SIGNUP_ID_TOKEN);
    registeredSecp256k1PublicKey = res.secp256k1PublicKey;
    registeredEd25519PublicKeyHex = res.ed25519PublicKeyHex;
  });

  it("should complete sign-in flow: commit → signin → get_key_shares", async () => {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    // oko_api commit
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_in",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idTokenHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    // KSN commits
    const ksNodePubkeys: string[] = [];
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_in",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });
      expect(ksnCommit.status).toBe(200);
      ksNodePubkeys.push(ksnCommit.body.data.node_pubkey);
    }

    // oko_api signin
    const signinSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "signin",
    );
    const signinRes = await request(ctx.okoApiApp)
      .post("/tss/v2/user/signin")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        cr_session_id: sessionId,
        cr_signature: signinSig,
      });
    expect(signinRes.status).toBe(200);
    expect(signinRes.body.success).toBe(true);

    // KSN get_key_shares on all nodes
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const sig = createRevealSignature(
        clientKeypair.privateKey,
        ksNodePubkeys[i],
        sessionId,
        AUTH_TYPE,
        SIGNIN_ID_TOKEN,
        "sign_in",
        "get_key_shares",
      );
      const res = await request(ctx.ksnApps[i])
        .post("/keyshare/v2")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: registeredSecp256k1PublicKey,
            ed25519: registeredEd25519PublicKeyHex,
          },
          cr_session_id: sessionId,
          cr_signature: sig,
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.secp256k1.share).toBeDefined();
      expect(res.body.data.ed25519.share).toBeDefined();
    }
  });

  it("should reject signin for non-existent user", async () => {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const nonToken = "non_existent_token";
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, nonToken);

    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_in",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idTokenHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    const sig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      nonToken,
      "sign_in",
      "signin",
    );
    const res = await request(ctx.okoApiApp)
      .post("/tss/v2/user/signin")
      .set("x-mock-user-id", "non_existent_user")
      .set("Authorization", `Bearer ${nonToken}`)
      .send({
        auth_type: AUTH_TYPE,
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("USER_NOT_FOUND");
  });

  it("should reject signin with invalid signature", async () => {
    const clientKeypair = generateClientKeypair();
    const wrongKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_in",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idTokenHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    const sig = createRevealSignature(
      wrongKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "signin",
    );
    const res = await request(ctx.okoApiApp)
      .post("/tss/v2/user/signin")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_SIGNATURE");
  });

  it("should reject get_key_shares for non-existent user", async () => {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const ksnCommit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_in",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(ksnCommit.status).toBe(200);

    const sig = createRevealSignature(
      clientKeypair.privateKey,
      ksnCommit.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "get_key_shares",
    );
    const res = await request(ctx.ksnApps[0])
      .post("/keyshare/v2")
      .set("x-mock-user-id", "non_existent_user")
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: { secp256k1: "03" + "f".repeat(64), ed25519: "f".repeat(64) },
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("USER_NOT_FOUND");
  });

  it("should reject get_key_shares with wrong public key (WALLET_NOT_FOUND)", async () => {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const ksnCommit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_in",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(ksnCommit.status).toBe(200);

    const sig = createRevealSignature(
      clientKeypair.privateKey,
      ksnCommit.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "get_key_shares",
    );
    const res = await request(ctx.ksnApps[0])
      .post("/keyshare/v2")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: "03" + "f".repeat(64), // wrong key
          ed25519: registeredEd25519PublicKeyHex,
        },
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("WALLET_NOT_FOUND");
  });

  it("should reject get_key_shares with invalid signature", async () => {
    const clientKeypair = generateClientKeypair();
    const wrongKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const ksnCommit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_in",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });
    expect(ksnCommit.status).toBe(200);

    const sig = createRevealSignature(
      wrongKeypair.privateKey,
      ksnCommit.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "get_key_shares",
    );
    const res = await request(ctx.ksnApps[0])
      .post("/keyshare/v2")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: registeredSecp256k1PublicKey,
          ed25519: registeredEd25519PublicKeyHex,
        },
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_SIGNATURE");
  });

  it("should report KEY_SHARE_NOT_FOUND nodes to oko_api (report-only)", async () => {
    // Create user on all nodes (normal sign_up), then induce WALLET_NOT_FOUND by using wrong key on one node
    await ctx.resetAllDatabases();
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    const frostKeygen = runKeygenCentralizedEd25519();
    const clientOut = frostKeygen.keygen_outputs[0];
    const serverOut = frostKeygen.keygen_outputs[1];
    const clientKP = new Uint8Array(clientOut.key_package);
    const shares = extractKeyPackageSharesEd25519(clientKP);
    const edPk = frostKeygen.public_key;
    const edPkHex = Buffer.from(edPk).toString("hex");
    const secpPk = "03" + "a".repeat(64);
    const sss = sssSplitEd25519(
      new Uint8Array(shares.signing_share),
      [
        generateNodeIdentifier(0),
        generateNodeIdentifier(1),
        generateNodeIdentifier(2),
      ],
      2,
    );

    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_up",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idTokenHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    // Register to all nodes
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });
      expect(ksnCommit.status).toBe(200);
      const kpBytes = new Uint8Array(sss.key_packages[i].key_package);
      const sh = extractKeyPackageSharesEd25519(kpBytes);
      const edShare =
        Buffer.from(sh.signing_share).toString("hex") +
        Buffer.from(sh.verifying_share).toString("hex");

      const regSig = createRevealSignature(
        clientKeypair.privateKey,
        ksnCommit.body.data.node_pubkey,
        sessionId,
        AUTH_TYPE,
        SIGNUP_ID_TOKEN,
        "sign_up",
        "register",
      );
      const reg = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: { public_key: secpPk, share: generateSecp256k1Share(i) },
            ed25519: { public_key: edPkHex, share: edShare },
          },
          cr_session_id: sessionId,
          cr_signature: regSig,
        });
      expect(reg.status).toBe(200);
    }

    // Keygen on oko_api
    const kgSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNUP_ID_TOKEN,
      "sign_up",
      "keygen",
    );
    const kg = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2_secp256k1: {
          public_key: secpPk,
          private_share: "e".repeat(64),
        },
        keygen_2_ed25519: {
          key_package: serverOut.key_package,
          public_key_package: Buffer.from(
            serverOut.public_key_package,
          ).toString("hex"),
          identifier: serverOut.identifier,
          public_key: edPk,
        },
        cr_session_id: sessionId,
        cr_signature: kgSig,
      });
    expect(kg.status).toBe(200);
    const jwt = kg.body.data.token as string;

    // Now sign_in commit and API signin
    const client2 = generateClientKeypair();
    const session2 = generateSessionId();
    const idHash2 = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);
    const okoCommit2 = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: session2,
        operation_type: "sign_in",
        client_ephemeral_pubkey: client2.publicKey.toHex(),
        id_token_hash: idHash2,
      });
    expect(okoCommit2.status).toBe(200);
    const okoNodePk2 = okoCommit2.body.data.node_pubkey;
    const signinSig2 = createRevealSignature(
      client2.privateKey,
      okoNodePk2,
      session2,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "signin",
    );
    const signin2 = await request(ctx.okoApiApp)
      .post("/tss/v2/user/signin")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        cr_session_id: session2,
        cr_signature: signinSig2,
      });
    expect(signin2.status).toBe(200);

    // Try get_key_shares on third node with wrong public key → WALLET_NOT_FOUND
    const ksnCommit3 = await request(ctx.ksnApps[2])
      .post("/keyshare/v2/commit")
      .send({
        session_id: session2,
        operation_type: "sign_in",
        client_ephemeral_pubkey: client2.publicKey.toHex(),
        id_token_hash: idHash2,
      });
    expect(ksnCommit3.status).toBe(200);
    const sig3 = createRevealSignature(
      client2.privateKey,
      ksnCommit3.body.data.node_pubkey,
      session2,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "get_key_shares",
    );
    const g3 = await request(ctx.ksnApps[2])
      .post("/keyshare/v2")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: { secp256k1: "03" + "f".repeat(64), ed25519: edPkHex },
        cr_session_id: session2,
        cr_signature: sig3,
      });
    expect(g3.status).toBe(404);
    expect(g3.body.code).toBe("WALLET_NOT_FOUND");

    // Report that node to oko_api with JWT (from keygen)
    const nodeInfo = ctx.ksnUrls.map((url, i) => ({
      name: `test_node_${i + 1}`,
      endpoint: url,
    }));
    const reportRes = await request(ctx.okoApiApp)
      .post("/tss/v2/user/report_key_share_not_found")
      .set("Authorization", `Bearer ${jwt}`)
      .send({ nodes: [nodeInfo[2]] });
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.success).toBe(true);
    expect(reportRes.body.data.updated_count_secp256k1).toBeGreaterThanOrEqual(
      0,
    );
    expect(reportRes.body.data.updated_count_ed25519).toBeGreaterThanOrEqual(0);
  });
});
