import request from "supertest";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import {
  runKeygenCentralizedEd25519,
  extractKeyPackageSharesEd25519,
} from "@oko-wallet/teddsa-addon/src/server";

import { createTestContext, type TestContext } from "@e2e/utils/test_context";
import {
  generateSessionId,
  generateClientKeypair,
  computeIdTokenHash,
  createRevealSignature,
} from "@e2e/utils/signature";

describe("handleExistingUserV2", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "existing_user_123";
  const SIGNUP_ID_TOKEN = "mock_id_token_signup"; // Token used during sign-up
  const SIGNIN_ID_TOKEN = "mock_id_token_signin"; // Different token for sign-in
  const AUTH_TYPE: AuthType = "google";

  // Stored from sign-up for use in sign-in tests
  let registeredSecp256k1PublicKey: string;
  let registeredEd25519PublicKeyHex: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    await ctx.resetAllDatabases();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  /**
   * Helper: Complete sign-up flow to create an existing user
   */
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

    // Generate FROST keys
    const frostKeygen = runKeygenCentralizedEd25519();
    const clientFrostOutput = frostKeygen.keygen_outputs[0];
    const serverFrostOutput = frostKeygen.keygen_outputs[1];
    const clientKeyPackage = new Uint8Array(clientFrostOutput.key_package);
    const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);
    const clientShareHex =
      Buffer.from(clientShares.signing_share).toString("hex") +
      Buffer.from(clientShares.verifying_share).toString("hex");
    const ed25519PublicKey = frostKeygen.public_key;
    const ed25519PublicKeyHex = Buffer.from(ed25519PublicKey).toString("hex");
    const secp256k1PublicKey = "03" + "a".repeat(64);

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

    // Commit and register to all KSN nodes
    const ksnNodePubkeys: string[] = [];
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
      ksnNodePubkeys.push(ksnCommitRes.body.data.node_pubkey);

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
              share: "c".repeat(128),
            },
            ed25519: {
              public_key: ed25519PublicKeyHex,
              share: clientShareHex,
            },
          },
          cr_session_id: sessionId,
          cr_signature: registerSignature,
          cr_final: true,
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
        cr_final: true,
      });
    expect(keygenRes.status).toBe(200);

    return { secp256k1PublicKey, ed25519PublicKeyHex };
  }

  beforeEach(async () => {
    await ctx.resetAllDatabases();
    // Create existing user for sign-in tests (using SIGNUP token)
    const result = await createExistingUser(TEST_USER_ID, SIGNUP_ID_TOKEN);
    registeredSecp256k1PublicKey = result.secp256k1PublicKey;
    registeredEd25519PublicKeyHex = result.ed25519PublicKeyHex;
  });

  it("should complete sign-in flow: commit -> signin -> get_key_shares", async () => {
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    // 1. Commit to oko_api with sign_in operation
    const okoApiCommitRes = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_in",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });

    expect(okoApiCommitRes.status).toBe(200);
    expect(okoApiCommitRes.body.success).toBe(true);
    const okoApiNodePubkey = okoApiCommitRes.body.data.node_pubkey;

    // 2. Commit to all KSN nodes with sign_in operation
    const ksnNodePubkeys: string[] = [];
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const ksnCommitRes = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_in",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(ksnCommitRes.status).toBe(200);
      ksnNodePubkeys.push(ksnCommitRes.body.data.node_pubkey);
    }

    // 3. Call signin on oko_api
    const signinSignature = createRevealSignature(
      clientKeypair.privateKey,
      okoApiNodePubkey,
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
        cr_signature: signinSignature,
        cr_final: false, // Not final - we still need to get key shares
      });

    expect(signinRes.status).toBe(200);
    expect(signinRes.body.success).toBe(true);
    expect(signinRes.body.data.user).toBeDefined();
    expect(signinRes.body.data.user.public_key_secp256k1).toBe(
      registeredSecp256k1PublicKey,
    );
    expect(signinRes.body.data.user.public_key_ed25519).toBe(
      registeredEd25519PublicKeyHex,
    );
    expect(signinRes.body.data.token).toBeDefined();

    // 4. Get key shares from all KSN nodes
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const getKeySharesSignature = createRevealSignature(
        clientKeypair.privateKey,
        ksnNodePubkeys[i],
        sessionId,
        AUTH_TYPE,
        SIGNIN_ID_TOKEN,
        "sign_in",
        "get_key_shares",
      );

      const getKeySharesRes = await request(ctx.ksnApps[i])
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
          cr_signature: getKeySharesSignature,
          cr_final: i === ctx.ksnApps.length - 1, // Final on last node
        });

      expect(getKeySharesRes.status).toBe(200);
      expect(getKeySharesRes.body.success).toBe(true);
      expect(getKeySharesRes.body.data.secp256k1).toBeDefined();
      expect(getKeySharesRes.body.data.secp256k1.share).toBeDefined();
      expect(getKeySharesRes.body.data.ed25519).toBeDefined();
      expect(getKeySharesRes.body.data.ed25519.share).toBeDefined();
    }
  });

  describe("Signin failures", () => {
    it("should reject signin for non-existent user", async () => {
      const clientKeypair = generateClientKeypair();
      const sessionId = generateSessionId();
      const nonExistentToken = "non_existent_user_token";
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, nonExistentToken);

      // Commit with sign_in
      const commitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_in",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(commitRes.status).toBe(200);
      const nodePubkey = commitRes.body.data.node_pubkey;

      // Try signin with non-existent user
      const signinSignature = createRevealSignature(
        clientKeypair.privateKey,
        nodePubkey,
        sessionId,
        AUTH_TYPE,
        nonExistentToken,
        "sign_in",
        "signin",
      );

      const signinRes = await request(ctx.okoApiApp)
        .post("/tss/v2/user/signin")
        .set("x-mock-user-id", "non_existent_user")
        .set("Authorization", `Bearer ${nonExistentToken}`)
        .send({
          auth_type: AUTH_TYPE,
          cr_session_id: sessionId,
          cr_signature: signinSignature,
          cr_final: true,
        });

      expect(signinRes.status).toBe(404);
      expect(signinRes.body.success).toBe(false);
      expect(signinRes.body.code).toBe("USER_NOT_FOUND");
    });

    it("should reject signin with invalid signature", async () => {
      const clientKeypair = generateClientKeypair();
      const wrongKeypair = generateClientKeypair();
      const sessionId = generateSessionId();
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

      // Commit
      const commitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_in",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(commitRes.status).toBe(200);
      const nodePubkey = commitRes.body.data.node_pubkey;

      // Try signin with wrong signature
      const wrongSignature = createRevealSignature(
        wrongKeypair.privateKey, // Wrong key!
        nodePubkey,
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
          cr_signature: wrongSignature,
          cr_final: true,
        });

      expect(signinRes.status).toBe(400);
      expect(signinRes.body.success).toBe(false);
      expect(signinRes.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should reject signin with wrong operation_type (signin not allowed for sign_up)", async () => {
      const clientKeypair = generateClientKeypair();
      const sessionId = generateSessionId();
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

      // Commit with sign_up (not sign_in!)
      const commitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up", // Wrong operation type!
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(commitRes.status).toBe(200);
      const nodePubkey = commitRes.body.data.node_pubkey;

      // Try signin with sign_up session
      const signinSignature = createRevealSignature(
        clientKeypair.privateKey,
        nodePubkey,
        sessionId,
        AUTH_TYPE,
        SIGNIN_ID_TOKEN,
        "sign_up", // Must match committed operation_type
        "signin",
      );

      const signinRes = await request(ctx.okoApiApp)
        .post("/tss/v2/user/signin")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          cr_session_id: sessionId,
          cr_signature: signinSignature,
          cr_final: true,
        });

      // signin is not allowed for sign_up operation
      expect(signinRes.status).toBe(400);
      expect(signinRes.body.success).toBe(false);
      expect(signinRes.body.code).toBe("INVALID_REQUEST");
      expect(signinRes.body.msg).toContain("not allowed");
    });
  });

  describe("Get key shares failures", () => {
    it("should reject get_key_shares for non-existent user", async () => {
      const clientKeypair = generateClientKeypair();
      const sessionId = generateSessionId();
      const nonExistentToken = "non_existent_token";
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, nonExistentToken);

      // Commit
      const commitRes = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_in",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(commitRes.status).toBe(200);
      const nodePubkey = commitRes.body.data.node_pubkey;

      const signature = createRevealSignature(
        clientKeypair.privateKey,
        nodePubkey,
        sessionId,
        AUTH_TYPE,
        nonExistentToken,
        "sign_in",
        "get_key_shares",
      );

      const getKeySharesRes = await request(ctx.ksnApps[0])
        .post("/keyshare/v2")
        .set("x-mock-user-id", "non_existent_user")
        .set("Authorization", `Bearer ${nonExistentToken}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: "03" + "f".repeat(64),
            ed25519: "f".repeat(64),
          },
          cr_session_id: sessionId,
          cr_signature: signature,
          cr_final: true,
        });

      expect(getKeySharesRes.status).toBe(404);
      expect(getKeySharesRes.body.success).toBe(false);
      expect(getKeySharesRes.body.code).toBe("USER_NOT_FOUND");
    });

    it("should reject get_key_shares with wrong public key", async () => {
      const clientKeypair = generateClientKeypair();
      const sessionId = generateSessionId();
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

      // Commit
      const commitRes = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_in",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(commitRes.status).toBe(200);
      const nodePubkey = commitRes.body.data.node_pubkey;

      const signature = createRevealSignature(
        clientKeypair.privateKey,
        nodePubkey,
        sessionId,
        AUTH_TYPE,
        SIGNIN_ID_TOKEN,
        "sign_in",
        "get_key_shares",
      );

      // Use wrong public key (different from registered)
      const getKeySharesRes = await request(ctx.ksnApps[0])
        .post("/keyshare/v2")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: "03" + "f".repeat(64), // Wrong key!
            ed25519: registeredEd25519PublicKeyHex,
          },
          cr_session_id: sessionId,
          cr_signature: signature,
          cr_final: true,
        });

      expect(getKeySharesRes.status).toBe(404);
      expect(getKeySharesRes.body.success).toBe(false);
      expect(getKeySharesRes.body.code).toBe("WALLET_NOT_FOUND");
    });

    it("should reject get_key_shares with invalid signature", async () => {
      const clientKeypair = generateClientKeypair();
      const wrongKeypair = generateClientKeypair();
      const sessionId = generateSessionId();
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

      // Commit
      const commitRes = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_in",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(commitRes.status).toBe(200);
      const nodePubkey = commitRes.body.data.node_pubkey;

      // Wrong signature
      const wrongSignature = createRevealSignature(
        wrongKeypair.privateKey, // Wrong key!
        nodePubkey,
        sessionId,
        AUTH_TYPE,
        SIGNIN_ID_TOKEN,
        "sign_in",
        "get_key_shares",
      );

      const getKeySharesRes = await request(ctx.ksnApps[0])
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
          cr_signature: wrongSignature,
          cr_final: true,
        });

      expect(getKeySharesRes.status).toBe(400);
      expect(getKeySharesRes.body.success).toBe(false);
      expect(getKeySharesRes.body.code).toBe("INVALID_SIGNATURE");
    });
  });
});
