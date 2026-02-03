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

describe("handleNewUserV2", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "test_user_123";
  const TEST_ID_TOKEN = "mock_id_token_for_testing";
  const AUTH_TYPE: AuthType = "google";

  beforeAll(async () => {
    ctx = await createTestContext();
    await ctx.resetAllDatabases();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    await ctx.resetAllDatabases();
  });

  it("should complete full sign-up flow: commit -> KSN register -> keygen", async () => {
    // 1. Generate client keypair and session
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, TEST_ID_TOKEN);

    // Generate real FROST ed25519 keys using napi addon
    const frostKeygen = runKeygenCentralizedEd25519();
    const clientFrostOutput = frostKeygen.keygen_outputs[0]; // P0 = client
    const serverFrostOutput = frostKeygen.keygen_outputs[1]; // P1 = server

    // Extract client's shares for KSN registration
    const clientKeyPackage = new Uint8Array(clientFrostOutput.key_package);
    const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);
    const clientShareHex =
      Buffer.from(clientShares.signing_share).toString("hex") +
      Buffer.from(clientShares.verifying_share).toString("hex");

    const ed25519PublicKey = frostKeygen.public_key; // 32 bytes
    const ed25519PublicKeyHex = Buffer.from(ed25519PublicKey).toString("hex");

    // 2. Commit to oko_api
    const okoApiCommitRes = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });

    expect(okoApiCommitRes.status).toBe(200);
    expect(okoApiCommitRes.body.success).toBe(true);
    expect(okoApiCommitRes.body.data.node_pubkey).toBeDefined();

    const okoApiNodePubkey = okoApiCommitRes.body.data.node_pubkey;

    // 3. Commit to all KSN nodes
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
      expect(ksnCommitRes.body.success).toBe(true);
      ksnNodePubkeys.push(ksnCommitRes.body.data.node_pubkey);
    }

    // 4. Register key shares to all KSN nodes
    const mockSecp256k1PublicKey = "03" + "a".repeat(64); // 33 bytes compressed

    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const signature = createRevealSignature(
        clientKeypair.privateKey,
        ksnNodePubkeys[i],
        sessionId,
        AUTH_TYPE,
        TEST_ID_TOKEN,
        "sign_up",
        "register",
      );

      const registerRes = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${TEST_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: mockSecp256k1PublicKey,
              share: "c".repeat(128), // 64 bytes
            },
            ed25519: {
              public_key: ed25519PublicKeyHex,
              share: clientShareHex, // 64 bytes (signing_share + verifying_share)
            },
          },
          cr_session_id: sessionId,
          cr_signature: signature,
          cr_final: true,
        });

      expect(registerRes.status).toBe(200);
      expect(registerRes.body.success).toBe(true);
    }

    // 5. Call keygen to oko_api
    const keygenSignature = createRevealSignature(
      clientKeypair.privateKey,
      okoApiNodePubkey,
      sessionId,
      AUTH_TYPE,
      TEST_ID_TOKEN,
      "sign_up",
      "keygen",
    );

    const keygenRes = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${TEST_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2_secp256k1: {
          public_key: mockSecp256k1PublicKey,
          private_share: "e".repeat(64), // 32 bytes
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

    if (keygenRes.status !== 200) {
      console.error("Keygen failed:", keygenRes.body);
    }
    expect(keygenRes.status).toBe(200);
    expect(keygenRes.body.success).toBe(true);
    expect(keygenRes.body.data.user).toBeDefined();
    expect(keygenRes.body.data.user.public_key_secp256k1).toBe(
      mockSecp256k1PublicKey,
    );
    expect(keygenRes.body.data.user.public_key_ed25519).toBe(
      ed25519PublicKeyHex,
    );
    expect(keygenRes.body.data.token).toBeDefined();
  });

  describe("Commit failures", () => {
    it("should reject duplicate session_id", async () => {
      const clientKeypair = generateClientKeypair();
      const sessionId = generateSessionId();
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, TEST_ID_TOKEN);

      // First commit should succeed
      const firstCommitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(firstCommitRes.status).toBe(200);

      // Second commit with same session_id should fail
      const newKeypair = generateClientKeypair();
      const newIdTokenHash = computeIdTokenHash(AUTH_TYPE, "different_token");

      const secondCommitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: newKeypair.publicKey.toHex(),
          id_token_hash: newIdTokenHash,
        });

      expect(secondCommitRes.status).toBe(409);
      expect(secondCommitRes.body.success).toBe(false);
      expect(secondCommitRes.body.code).toBe("SESSION_ALREADY_EXISTS");
    });

    it("should reject duplicate id_token_hash", async () => {
      const clientKeypair1 = generateClientKeypair();
      const clientKeypair2 = generateClientKeypair();
      const sessionId1 = generateSessionId();
      const sessionId2 = generateSessionId();
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, TEST_ID_TOKEN);

      // First commit should succeed
      const firstCommitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId1,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair1.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(firstCommitRes.status).toBe(200);

      // Second commit with same id_token_hash should fail
      const secondCommitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId2,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair2.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(secondCommitRes.status).toBe(409);
      expect(secondCommitRes.body.success).toBe(false);
      // All commit conflicts return SESSION_ALREADY_EXISTS
      expect(secondCommitRes.body.code).toBe("SESSION_ALREADY_EXISTS");
    });

    it("should reject duplicate client_ephemeral_pubkey", async () => {
      const clientKeypair = generateClientKeypair();
      const sessionId1 = generateSessionId();
      const sessionId2 = generateSessionId();
      const idTokenHash1 = computeIdTokenHash(AUTH_TYPE, "token1");
      const idTokenHash2 = computeIdTokenHash(AUTH_TYPE, "token2");

      // First commit should succeed
      const firstCommitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId1,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash1,
        });

      expect(firstCommitRes.status).toBe(200);

      // Second commit with same pubkey should fail
      const secondCommitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId2,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash2,
        });

      expect(secondCommitRes.status).toBe(409);
      expect(secondCommitRes.body.success).toBe(false);
      // All commit conflicts return SESSION_ALREADY_EXISTS
      expect(secondCommitRes.body.code).toBe("SESSION_ALREADY_EXISTS");
    });
  });

  describe("Register failures", () => {
    it("should reject register without commit (session not found)", async () => {
      const clientKeypair = generateClientKeypair();
      const sessionId = generateSessionId();

      // Create a fake signature (won't matter since session doesn't exist)
      const signature = createRevealSignature(
        clientKeypair.privateKey,
        "0".repeat(64), // fake node pubkey
        sessionId,
        AUTH_TYPE,
        TEST_ID_TOKEN,
        "sign_up",
        "register",
      );

      const registerRes = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${TEST_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: "03" + "a".repeat(64),
              share: "c".repeat(128),
            },
            ed25519: {
              public_key: "b".repeat(64),
              share: "d".repeat(128),
            },
          },
          cr_session_id: sessionId,
          cr_signature: signature,
          cr_final: true,
        });

      expect(registerRes.status).toBe(404);
      expect(registerRes.body.success).toBe(false);
      expect(registerRes.body.code).toBe("SESSION_NOT_FOUND");
    });

    it("should reject register with invalid signature", async () => {
      const clientKeypair = generateClientKeypair();
      const wrongKeypair = generateClientKeypair(); // Different keypair for wrong signature
      const sessionId = generateSessionId();
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, TEST_ID_TOKEN);

      // Commit to KSN
      const commitRes = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(commitRes.status).toBe(200);
      const nodePubkey = commitRes.body.data.node_pubkey;

      // Create signature with WRONG private key
      const wrongSignature = createRevealSignature(
        wrongKeypair.privateKey, // Wrong key!
        nodePubkey,
        sessionId,
        AUTH_TYPE,
        TEST_ID_TOKEN,
        "sign_up",
        "register",
      );

      const registerRes = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${TEST_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: "03" + "a".repeat(64),
              share: "c".repeat(128),
            },
            ed25519: {
              public_key: "b".repeat(64),
              share: "d".repeat(128),
            },
          },
          cr_session_id: sessionId,
          cr_signature: wrongSignature,
          cr_final: true,
        });

      expect(registerRes.status).toBe(400);
      expect(registerRes.body.success).toBe(false);
      expect(registerRes.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should reject keygen with wrong operation_type (keygen not allowed for sign_in)", async () => {
      const clientKeypair = generateClientKeypair();
      const sessionId = generateSessionId();
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, TEST_ID_TOKEN);

      // Generate FROST keys
      const frostKeygen = runKeygenCentralizedEd25519();
      const serverFrostOutput = frostKeygen.keygen_outputs[1];
      const ed25519PublicKey = frostKeygen.public_key;

      // Commit with sign_in operation type (not sign_up!)
      const commitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_in", // Not sign_up!
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(commitRes.status).toBe(200);
      const nodePubkey = commitRes.body.data.node_pubkey;

      // Try to call keygen with sign_in session (keygen is only allowed for sign_up)
      const signature = createRevealSignature(
        clientKeypair.privateKey,
        nodePubkey,
        sessionId,
        AUTH_TYPE,
        TEST_ID_TOKEN,
        "sign_in", // Must match committed operation_type
        "keygen",
      );

      const keygenRes = await request(ctx.okoApiApp)
        .post("/tss/v2/keygen")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${TEST_ID_TOKEN}`)
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
            public_key: ed25519PublicKey,
          },
          cr_session_id: sessionId,
          cr_signature: signature,
          cr_final: true,
        });

      // keygen is not allowed for sign_in operation
      expect(keygenRes.status).toBe(400);
      expect(keygenRes.body.success).toBe(false);
      expect(keygenRes.body.code).toBe("INVALID_REQUEST");
      expect(keygenRes.body.msg).toContain("not allowed");
    });

    it("should reject duplicate public key in register", async () => {
      // First, complete a successful registration
      const clientKeypair1 = generateClientKeypair();
      const sessionId1 = generateSessionId();
      const idTokenHash1 = computeIdTokenHash(AUTH_TYPE, "token1");

      const commitRes1 = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId1,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair1.publicKey.toHex(),
          id_token_hash: idTokenHash1,
        });

      expect(commitRes1.status).toBe(200);
      const nodePubkey1 = commitRes1.body.data.node_pubkey;

      const duplicatePublicKey = "03" + "a".repeat(64);

      const signature1 = createRevealSignature(
        clientKeypair1.privateKey,
        nodePubkey1,
        sessionId1,
        AUTH_TYPE,
        "token1",
        "sign_up",
        "register",
      );

      const registerRes1 = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", "user1")
        .set("Authorization", "Bearer token1")
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: duplicatePublicKey,
              share: "c".repeat(128),
            },
            ed25519: {
              public_key: "b".repeat(64),
              share: "d".repeat(128),
            },
          },
          cr_session_id: sessionId1,
          cr_signature: signature1,
          cr_final: true,
        });

      expect(registerRes1.status).toBe(200);

      // Now try to register with same public key but different user
      const clientKeypair2 = generateClientKeypair();
      const sessionId2 = generateSessionId();
      const idTokenHash2 = computeIdTokenHash(AUTH_TYPE, "token2");

      const commitRes2 = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId2,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair2.publicKey.toHex(),
          id_token_hash: idTokenHash2,
        });

      expect(commitRes2.status).toBe(200);
      const nodePubkey2 = commitRes2.body.data.node_pubkey;

      const signature2 = createRevealSignature(
        clientKeypair2.privateKey,
        nodePubkey2,
        sessionId2,
        AUTH_TYPE,
        "token2",
        "sign_up",
        "register",
      );

      const registerRes2 = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", "user2")
        .set("Authorization", "Bearer token2")
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: duplicatePublicKey, // Same public key!
              share: "c".repeat(128),
            },
            ed25519: {
              public_key: "e".repeat(64),
              share: "f".repeat(128),
            },
          },
          cr_session_id: sessionId2,
          cr_signature: signature2,
          cr_final: true,
        });

      expect(registerRes2.status).toBe(409);
      expect(registerRes2.body.success).toBe(false);
      expect(registerRes2.body.code).toBe("DUPLICATE_PUBLIC_KEY");
    });
  });

  describe("Keygen failures", () => {
    it("should reject keygen without KSN registration", async () => {
      const clientKeypair = generateClientKeypair();
      const sessionId = generateSessionId();
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, TEST_ID_TOKEN);

      // Generate FROST keys
      const frostKeygen = runKeygenCentralizedEd25519();
      const serverFrostOutput = frostKeygen.keygen_outputs[1];
      const ed25519PublicKey = frostKeygen.public_key;

      // Commit to oko_api only (skip KSN registration)
      const commitRes = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(commitRes.status).toBe(200);
      const nodePubkey = commitRes.body.data.node_pubkey;

      // Try keygen without registering to KSN
      const keygenSignature = createRevealSignature(
        clientKeypair.privateKey,
        nodePubkey,
        sessionId,
        AUTH_TYPE,
        TEST_ID_TOKEN,
        "sign_up",
        "keygen",
      );

      const keygenRes = await request(ctx.okoApiApp)
        .post("/tss/v2/keygen")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${TEST_ID_TOKEN}`)
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
            public_key: ed25519PublicKey,
          },
          cr_session_id: sessionId,
          cr_signature: keygenSignature,
          cr_final: true,
        });

      expect(keygenRes.status).toBe(400);
      expect(keygenRes.body.success).toBe(false);
      expect(keygenRes.body.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
    });

    it("should reject keygen with invalid signature", async () => {
      const clientKeypair = generateClientKeypair();
      const wrongKeypair = generateClientKeypair();
      const sessionId = generateSessionId();
      const idTokenHash = computeIdTokenHash(AUTH_TYPE, TEST_ID_TOKEN);

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
      const mockSecp256k1PublicKey = "03" + "a".repeat(64);

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
        const ksnNodePubkey = ksnCommitRes.body.data.node_pubkey;

        const registerSignature = createRevealSignature(
          clientKeypair.privateKey,
          ksnNodePubkey,
          sessionId,
          AUTH_TYPE,
          TEST_ID_TOKEN,
          "sign_up",
          "register",
        );

        const registerRes = await request(ctx.ksnApps[i])
          .post("/keyshare/v2/register")
          .set("x-mock-user-id", TEST_USER_ID)
          .set("Authorization", `Bearer ${TEST_ID_TOKEN}`)
          .send({
            auth_type: AUTH_TYPE,
            wallets: {
              secp256k1: {
                public_key: mockSecp256k1PublicKey,
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

      // Try keygen with WRONG signature
      const wrongSignature = createRevealSignature(
        wrongKeypair.privateKey, // Wrong key!
        okoApiNodePubkey,
        sessionId,
        AUTH_TYPE,
        TEST_ID_TOKEN,
        "sign_up",
        "keygen",
      );

      const keygenRes = await request(ctx.okoApiApp)
        .post("/tss/v2/keygen")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${TEST_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          keygen_2_secp256k1: {
            public_key: mockSecp256k1PublicKey,
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
          cr_signature: wrongSignature,
          cr_final: true,
        });

      expect(keygenRes.status).toBe(400);
      expect(keygenRes.body.success).toBe(false);
      expect(keygenRes.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should reject keygen with duplicate public key", async () => {
      // First, complete a successful keygen
      const clientKeypair1 = generateClientKeypair();
      const sessionId1 = generateSessionId();
      const idTokenHash1 = computeIdTokenHash(AUTH_TYPE, "token1");

      const frostKeygen1 = runKeygenCentralizedEd25519();
      const clientFrostOutput1 = frostKeygen1.keygen_outputs[0];
      const serverFrostOutput1 = frostKeygen1.keygen_outputs[1];
      const clientKeyPackage1 = new Uint8Array(clientFrostOutput1.key_package);
      const clientShares1 = extractKeyPackageSharesEd25519(clientKeyPackage1);
      const clientShareHex1 =
        Buffer.from(clientShares1.signing_share).toString("hex") +
        Buffer.from(clientShares1.verifying_share).toString("hex");
      const ed25519PublicKey1 = frostKeygen1.public_key;
      const ed25519PublicKeyHex1 =
        Buffer.from(ed25519PublicKey1).toString("hex");
      const duplicateSecp256k1PublicKey = "03" + "b".repeat(64);

      // Complete first user registration
      const okoApiCommitRes1 = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId1,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair1.publicKey.toHex(),
          id_token_hash: idTokenHash1,
        });

      expect(okoApiCommitRes1.status).toBe(200);
      const okoApiNodePubkey1 = okoApiCommitRes1.body.data.node_pubkey;

      const ksnNodePubkeys1: string[] = [];
      for (let i = 0; i < ctx.ksnApps.length; i++) {
        const ksnCommitRes = await request(ctx.ksnApps[i])
          .post("/keyshare/v2/commit")
          .send({
            session_id: sessionId1,
            operation_type: "sign_up",
            client_ephemeral_pubkey: clientKeypair1.publicKey.toHex(),
            id_token_hash: idTokenHash1,
          });

        expect(ksnCommitRes.status).toBe(200);
        ksnNodePubkeys1.push(ksnCommitRes.body.data.node_pubkey);

        const registerSignature = createRevealSignature(
          clientKeypair1.privateKey,
          ksnCommitRes.body.data.node_pubkey,
          sessionId1,
          AUTH_TYPE,
          "token1",
          "sign_up",
          "register",
        );

        const registerRes = await request(ctx.ksnApps[i])
          .post("/keyshare/v2/register")
          .set("x-mock-user-id", "user1")
          .set("Authorization", "Bearer token1")
          .send({
            auth_type: AUTH_TYPE,
            wallets: {
              secp256k1: {
                public_key: duplicateSecp256k1PublicKey,
                share: "c".repeat(128),
              },
              ed25519: {
                public_key: ed25519PublicKeyHex1,
                share: clientShareHex1,
              },
            },
            cr_session_id: sessionId1,
            cr_signature: registerSignature,
            cr_final: true,
          });

        expect(registerRes.status).toBe(200);
      }

      const keygenSignature1 = createRevealSignature(
        clientKeypair1.privateKey,
        okoApiNodePubkey1,
        sessionId1,
        AUTH_TYPE,
        "token1",
        "sign_up",
        "keygen",
      );

      const keygenRes1 = await request(ctx.okoApiApp)
        .post("/tss/v2/keygen")
        .set("x-mock-user-id", "user1")
        .set("Authorization", "Bearer token1")
        .send({
          auth_type: AUTH_TYPE,
          keygen_2_secp256k1: {
            public_key: duplicateSecp256k1PublicKey,
            private_share: "e".repeat(64),
          },
          keygen_2_ed25519: {
            key_package: serverFrostOutput1.key_package,
            public_key_package: Buffer.from(
              serverFrostOutput1.public_key_package,
            ).toString("hex"),
            identifier: serverFrostOutput1.identifier,
            public_key: ed25519PublicKey1,
          },
          cr_session_id: sessionId1,
          cr_signature: keygenSignature1,
          cr_final: true,
        });

      expect(keygenRes1.status).toBe(200);

      // Now try second user with same secp256k1 public key
      const clientKeypair2 = generateClientKeypair();
      const sessionId2 = generateSessionId();
      const idTokenHash2 = computeIdTokenHash(AUTH_TYPE, "token2");

      const frostKeygen2 = runKeygenCentralizedEd25519();
      const clientFrostOutput2 = frostKeygen2.keygen_outputs[0];
      const clientKeyPackage2 = new Uint8Array(clientFrostOutput2.key_package);
      const clientShares2 = extractKeyPackageSharesEd25519(clientKeyPackage2);
      const clientShareHex2 =
        Buffer.from(clientShares2.signing_share).toString("hex") +
        Buffer.from(clientShares2.verifying_share).toString("hex");
      const ed25519PublicKey2 = frostKeygen2.public_key;
      const ed25519PublicKeyHex2 =
        Buffer.from(ed25519PublicKey2).toString("hex");

      const okoApiCommitRes2 = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId2,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair2.publicKey.toHex(),
          id_token_hash: idTokenHash2,
        });

      expect(okoApiCommitRes2.status).toBe(200);

      // Test only first KSN node for duplicate rejection
      const ksnCommitRes = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId2,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair2.publicKey.toHex(),
          id_token_hash: idTokenHash2,
        });

      expect(ksnCommitRes.status).toBe(200);

      const registerSignature = createRevealSignature(
        clientKeypair2.privateKey,
        ksnCommitRes.body.data.node_pubkey,
        sessionId2,
        AUTH_TYPE,
        "token2",
        "sign_up",
        "register",
      );

      // KSN should reject duplicate public key
      const registerRes = await request(ctx.ksnApps[0])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", "user2")
        .set("Authorization", "Bearer token2")
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: duplicateSecp256k1PublicKey, // Same key!
              share: "c".repeat(128),
            },
            ed25519: {
              public_key: ed25519PublicKeyHex2,
              share: clientShareHex2,
            },
          },
          cr_session_id: sessionId2,
          cr_signature: registerSignature,
          cr_final: true,
        });

      expect(registerRes.status).toBe(409);
      expect(registerRes.body.success).toBe(false);
      expect(registerRes.body.code).toBe("DUPLICATE_PUBLIC_KEY");
    });
  });
});
