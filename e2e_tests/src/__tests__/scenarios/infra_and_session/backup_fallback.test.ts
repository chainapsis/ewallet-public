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

describe("e2e_test_backup_fallback_ks_nodes", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "backup_user_123";
  const SIGNUP_ID_TOKEN = "mock_id_token_signup";
  const SIGNIN_ID_TOKEN = "mock_id_token_signin";
  const AUTH_TYPE: AuthType = "google";

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

  it("uses ready node first, then falls back to pending commit node; reports NOT_FOUND nodes", async () => {
    await ctx.resetAllDatabases();

    // 1) Create existing user with wallets on node1 and node2 only (node0 missing)
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    // Centralized Ed25519 keygen and SSS split (2-of-3)
    const frostKeygen = runKeygenCentralizedEd25519();
    const clientOut = frostKeygen.keygen_outputs[0];
    const serverOut = frostKeygen.keygen_outputs[1];
    const clientKeyPackage = new Uint8Array(clientOut.key_package);
    const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);
    const ed25519PublicKey = frostKeygen.public_key;
    const ed25519PublicKeyHex = Buffer.from(ed25519PublicKey).toString("hex");
    const secp256k1PublicKey = "03" + "a".repeat(64);

    const signingShare = new Uint8Array(clientShares.signing_share);
    const nodeIdentifiers = [
      generateNodeIdentifier(0),
      generateNodeIdentifier(1),
      generateNodeIdentifier(2),
    ];
    const sssOutput = sssSplitEd25519(signingShare, nodeIdentifiers, 2);

    // Commit to oko_api
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_up",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idTokenHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    // Register to node1 and node2 only (skip node0)
    for (let i = 1; i <= 2; i++) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });
      expect(ksnCommit.status).toBe(200);

      const kpBytes = new Uint8Array(sssOutput.key_packages[i].key_package);
      const shares = extractKeyPackageSharesEd25519(kpBytes);
      const edShare =
        Buffer.from(shares.signing_share).toString("hex") +
        Buffer.from(shares.verifying_share).toString("hex");

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
            secp256k1: {
              public_key: secp256k1PublicKey,
              share: generateSecp256k1Share(i),
            },
            ed25519: { public_key: ed25519PublicKeyHex, share: edShare },
          },
          cr_session_id: sessionId,
          cr_signature: regSig,
        });
      expect(reg.status).toBe(200);
    }

    // Mark node0 INACTIVE in oko_api so active nodes = 2
    await ctx.okoApiPool.query(
      `UPDATE key_share_nodes SET status = 'INACTIVE', updated_at = NOW() WHERE server_url = $1`,
      [ctx.ksnUrls[0]],
    );

    // oko_api keygen to finalize wallets and get JWT on sign_in
    const kgSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNUP_ID_TOKEN,
      "sign_up",
      "keygen",
    );
    const keygen = await request(ctx.okoApiApp)
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
          key_package: serverOut.key_package,
          public_key_package: Buffer.from(
            serverOut.public_key_package,
          ).toString("hex"),
          identifier: serverOut.identifier,
          public_key: ed25519PublicKey,
        },
        cr_session_id: sessionId,
        cr_signature: kgSig,
      });
    expect(keygen.status).toBe(200);

    // 2) Sign-in with backup fallback behavior
    const signInKeypair = generateClientKeypair();
    const signInSession = generateSessionId();
    const signInHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    // oko_api commit
    const okoSignCommit = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: signInSession,
        operation_type: "sign_in",
        client_ephemeral_pubkey: signInKeypair.publicKey.toHex(),
        id_token_hash: signInHash,
      });
    expect(okoSignCommit.status).toBe(200);
    const okoSignNodePk = okoSignCommit.body.data.node_pubkey;

    // KSN commit: node1 first (ready), node2 later (pending), node0 will be committed third
    const readyIndex = 1;
    const pendingIndex = 2;
    const notFoundIndex = 0;

    const ksnCommitReady = await request(ctx.ksnApps[readyIndex])
      .post("/keyshare/v2/commit")
      .send({
        session_id: signInSession,
        operation_type: "sign_in",
        client_ephemeral_pubkey: signInKeypair.publicKey.toHex(),
        id_token_hash: signInHash,
      });
    expect(ksnCommitReady.status).toBe(200);

    // oko_api signin to get JWT and public keys
    const signinSig = createRevealSignature(
      signInKeypair.privateKey,
      okoSignNodePk,
      signInSession,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "signin",
    );
    const signin = await request(ctx.okoApiApp)
      .post("/tss/v2/user/signin")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        cr_session_id: signInSession,
        cr_signature: signinSig,
      });
    expect(signin.status).toBe(200);
    const jwt = signin.body.data.token as string;
    const pkSecp = signin.body.data.user.public_key_secp256k1 as string;
    const pkEd = signin.body.data.user.public_key_ed25519 as string;

    // Request share from ready node (node1)
    const sigReady = createRevealSignature(
      signInKeypair.privateKey,
      ksnCommitReady.body.data.node_pubkey,
      signInSession,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "get_key_shares",
    );
    const gReady = await request(ctx.ksnApps[readyIndex])
      .post("/keyshare/v2")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: { secp256k1: pkSecp, ed25519: pkEd },
        cr_session_id: signInSession,
        cr_signature: sigReady,
      });
    expect(gReady.status).toBe(200);

    // Now commit pending node (node2) and request from it (backup)
    const ksnCommitPending = await request(ctx.ksnApps[pendingIndex])
      .post("/keyshare/v2/commit")
      .send({
        session_id: signInSession,
        operation_type: "sign_in",
        client_ephemeral_pubkey: signInKeypair.publicKey.toHex(),
        id_token_hash: signInHash,
      });
    expect(ksnCommitPending.status).toBe(200);
    const sigPending = createRevealSignature(
      signInKeypair.privateKey,
      ksnCommitPending.body.data.node_pubkey,
      signInSession,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "get_key_shares",
    );
    const gPending = await request(ctx.ksnApps[pendingIndex])
      .post("/keyshare/v2")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: { secp256k1: pkSecp, ed25519: pkEd },
        cr_session_id: signInSession,
        cr_signature: sigPending,
      });
    expect(gPending.status).toBe(200);

    // Request from not-registered node (node0) → WALLET_NOT_FOUND, collect notFound
    const ksnCommitNotFound = await request(ctx.ksnApps[notFoundIndex])
      .post("/keyshare/v2/commit")
      .send({
        session_id: signInSession,
        operation_type: "sign_in",
        client_ephemeral_pubkey: signInKeypair.publicKey.toHex(),
        id_token_hash: signInHash,
      });
    expect(ksnCommitNotFound.status).toBe(200);
    const sigNF = createRevealSignature(
      signInKeypair.privateKey,
      ksnCommitNotFound.body.data.node_pubkey,
      signInSession,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "get_key_shares",
    );
    const gNF = await request(ctx.ksnApps[notFoundIndex])
      .post("/keyshare/v2")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: { secp256k1: pkSecp, ed25519: pkEd },
        cr_session_id: signInSession,
        cr_signature: sigNF,
      });
    expect(gNF.status).toBe(404);
    expect(["WALLET_NOT_FOUND", "USER_NOT_FOUND"]).toContain(gNF.body.code);

    // 3) Report NOT_FOUND node to oko_api
    const nodeInfo = ctx.ksnUrls.map((url, i) => ({
      name: `test_node_${i + 1}`,
      endpoint: url,
    }));
    const report = await request(ctx.okoApiApp)
      .post("/tss/v2/user/report_key_share_not_found")
      .set("Authorization", `Bearer ${jwt}`)
      .send({ nodes: [nodeInfo[notFoundIndex]] });
    expect(report.status).toBe(200);
    expect(report.body.success).toBe(true);
  });
});
