import request from "supertest";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import {
  runKeygenCentralizedEd25519,
  extractKeyPackageSharesEd25519,
  sssSplitEd25519,
  sssExtendEd25519,
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
  const SIGNUP_ID_TOKEN = "mock_id_token_signup";
  const SIGNIN_ID_TOKEN = "mock_id_token_signin";
  const AUTH_TYPE: AuthType = "google";

  let registeredSecp256k1PublicKey: string;
  let registeredEd25519PublicKeyHex: string;

  let ksnNodeShares: Array<{
    secp256k1Share: string;
    ed25519Share: string;
    ed25519KeyPackage: Uint8Array; // For SSS extend
  }>;
  // Public key package needed for SSS extend
  let ed25519PublicKeyPackage: Uint8Array;

  beforeAll(async () => {
    ctx = await createTestContext();
    await ctx.resetAllDatabases();
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
    nodeShares: Array<{
      secp256k1Share: string;
      ed25519Share: string;
      ed25519KeyPackage: Uint8Array;
    }>;
    publicKeyPackage: Uint8Array;
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
    // Split the client's signing_share using 2-of-3 threshold
    const signingShare = new Uint8Array(clientShares.signing_share);
    const nodeIdentifiers = [
      generateNodeIdentifier(0),
      generateNodeIdentifier(1),
      generateNodeIdentifier(2),
    ];

    const sssOutput = sssSplitEd25519(signingShare, nodeIdentifiers, 2);

    // Build node shares from SSS output
    const nodeShares: Array<{
      secp256k1Share: string;
      ed25519Share: string;
      ed25519KeyPackage: Uint8Array;
    }> = [];
    for (let i = 0; i < 3; i++) {
      const keyPackage = sssOutput.key_packages[i];
      const keyPackageBytes = new Uint8Array(keyPackage.key_package);

      // Extract signing_share from the key package for the share hex
      const shares = extractKeyPackageSharesEd25519(keyPackageBytes);
      const ed25519Share =
        Buffer.from(shares.signing_share).toString("hex") +
        Buffer.from(shares.verifying_share).toString("hex");

      nodeShares.push({
        secp256k1Share: generateSecp256k1Share(i),
        ed25519Share,
        ed25519KeyPackage: keyPackageBytes,
      });
    }

    // Store public key package for SSS extend
    const publicKeyPackage = new Uint8Array(
      sssOutput.key_packages[0].public_key_package,
    );

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
    const ksNodePubkeys: string[] = [];
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
      ksNodePubkeys.push(ksnCommitRes.body.data.node_pubkey);

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
              share: nodeShares[i].secp256k1Share,
            },
            ed25519: {
              public_key: ed25519PublicKeyHex,
              share: nodeShares[i].ed25519Share,
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

    return {
      secp256k1PublicKey,
      ed25519PublicKeyHex,
      nodeShares,
      publicKeyPackage,
    };
  }

  beforeEach(async () => {
    await ctx.resetAllDatabases();
    // Create existing user for sign-in tests (using SIGNUP token)
    const result = await createExistingUser(TEST_USER_ID, SIGNUP_ID_TOKEN);
    registeredSecp256k1PublicKey = result.secp256k1PublicKey;
    registeredEd25519PublicKeyHex = result.ed25519PublicKeyHex;
    ksnNodeShares = result.nodeShares;
    ed25519PublicKeyPackage = result.publicKeyPackage;
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

    // 2. Commit to all KS nodes with sign_in operation
    const ksNodePubkeys: string[] = [];
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
      ksNodePubkeys.push(ksnCommitRes.body.data.node_pubkey);
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

    // 4. Get key shares from all KS nodes
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const getKeySharesSignature = createRevealSignature(
        clientKeypair.privateKey,
        ksNodePubkeys[i],
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
        wrongKeypair.privateKey, // Wrong key
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

      // Commit with sign_up (not sign_in)
      const commitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up", // Wrong operation type
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
            secp256k1: "03" + "f".repeat(64), // Wrong key
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
        wrongKeypair.privateKey, // Wrong key
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
