/**
 * E2E Integration Tests for Commit-Reveal + KeyShare v2 APIs
 *
 * Tests the full flow:
 * 1. Commit phase - POST /keyshare/v2/commit
 * 2. Reveal + API call - POST /keyshare/v2/xxx with commit-reveal signature
 * 3. Verify data persistence and session state updates
 */
import request from "supertest";
import express from "express";
import { Pool } from "pg";
import dayjs from "dayjs";
import { Bytes } from "@oko-wallet/bytes";
import { v4 as uuidv4 } from "uuid";
import {
  generateEddsaKeypair,
  signMessage,
  convertEddsaSignatureToBytes,
} from "@oko-wallet/crypto-js/node/ecdhe";
import { sha256 } from "@oko-wallet/crypto-js";

import { connectPG, resetPgDatabase } from "@oko-wallet-ksn-server/database";
import { testPgConfig } from "@oko-wallet-ksn-server/database/test_config";
import type { ServerState } from "@oko-wallet-ksn-server/state";
import type { OperationType } from "@oko-wallet/ksn-interface/commit_reveal";
import { getCommitRevealSessionBySessionId } from "@oko-wallet/ksn-pg-interface/commit_reveal";
import { checkKeyShareV2 } from "@oko-wallet-ksn-server/api/key_share";
import { commitRevealMiddleware } from "@oko-wallet-ksn-server/middlewares";
import { keyshareV2Register } from "./register";
import { getKeysharesV2 } from "./get_key_shares";
import { registerKeyshareEd25519 } from "./ed25519";
import { keyshareV2Reshare } from "./reshare";
import { commit } from "./commit";

// Mock server keypair (must match the one used by the commit endpoint)
const serverPrivateKeyRes = Bytes.fromHexString(
  "0000000000000000000000000000000000000000000000000000000000000001",
  32,
);
const serverPublicKeyRes = Bytes.fromHexString(
  "4cb5abf6ad79fbf5abbccafcc269d85cd2651ed4b885b5869f241aedf0a5ba29",
  32,
);
if (!serverPrivateKeyRes.success || !serverPublicKeyRes.success) {
  throw new Error("Failed to create mock server keypair");
}
const mockServerKeypair = {
  privateKey: serverPrivateKeyRes.data,
  publicKey: serverPublicKeyRes.data,
};

// Test data
const TEST_SECP256K1_PK =
  "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";
const TEST_ED25519_PK =
  "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";
const TEST_ENC_SECRET = "test_enc_secret";

// Generate random 64-byte share (hex)
function generateRandomShare(): string {
  const arr = Array.from({ length: 64 }, () => Math.floor(Math.random() * 256));
  return Buffer.from(arr).toString("hex");
}

interface E2ETestContext {
  sessionId: string;
  clientKeypair: {
    privateKey: Bytes<32>;
    publicKey: Bytes<32>;
  };
  idToken: string;
  authType: string;
  operationType: OperationType;
  userIdentifier: string;
}

function createE2ETestContext(
  overrides: Partial<E2ETestContext> = {},
): E2ETestContext {
  const keypairRes = generateEddsaKeypair();
  if (!keypairRes.success) {
    throw new Error(`Failed to generate keypair: ${keypairRes.err}`);
  }

  const idToken = `test_id_token_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  return {
    sessionId: uuidv4(),
    clientKeypair: keypairRes.data,
    idToken,
    authType: "google",
    operationType: "sign_up",
    userIdentifier: `google_test_user_${Date.now()}`,
    ...overrides,
  };
}

function computeIdTokenHash(authType: string, idToken: string): string {
  const hashRes = sha256(`${authType}${idToken}`);
  if (!hashRes.success) {
    throw new Error(`Failed to compute hash: ${hashRes.err}`);
  }
  return hashRes.data.toHex();
}

function createRevealSignature(
  ctx: E2ETestContext,
  nodePubkeyHex: string,
  apiName: string,
): string {
  const message = `${nodePubkeyHex}${ctx.sessionId}${ctx.authType}${ctx.idToken}${ctx.operationType}${apiName}`;
  const signRes = signMessage(message, ctx.clientKeypair.privateKey);
  if (!signRes.success) {
    throw new Error(`Failed to sign message: ${signRes.err}`);
  }
  const sigBytesRes = convertEddsaSignatureToBytes(signRes.data);
  if (!sigBytesRes.success) {
    throw new Error(`Failed to convert signature: ${sigBytesRes.err}`);
  }
  return sigBytesRes.data.toHex();
}

/**
 * Mock OAuth middleware that bypasses actual token validation
 * and sets res.locals.oauth_user based on a custom header
 */
function mockOAuthMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const mockUserId = req.headers["x-mock-user-id"] as string;
  const authType = (req.body?.auth_type ?? "google") as string;

  if (!mockUserId) {
    res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      msg: "x-mock-user-id header required for testing",
    });
    return;
  }

  res.locals.oauth_user = {
    type: authType,
    user_identifier: mockUserId,
  };

  next();
}

describe("e2e_commit_reveal_keyshare_test", () => {
  let pool: Pool;
  let app: express.Application;

  beforeAll(async () => {
    const config = testPgConfig;
    const createPostgresRes = await connectPG({
      database: config.database,
      host: config.host,
      password: config.password,
      user: config.user,
      port: config.port,
      ssl: config.ssl,
    });

    if (createPostgresRes.success === false) {
      console.error(createPostgresRes.err);
      throw new Error("Failed to create postgres database");
    }

    pool = createPostgresRes.data;
  });

  beforeEach(async () => {
    await resetPgDatabase(pool);

    // Create fresh app for each test
    app = express();
    app.use(express.json());

    app.locals = {
      db: pool,
      encryptionSecret: TEST_ENC_SECRET,
      serverKeypair: mockServerKeypair,
      telegram_bot_token: "temp_telegram_bot_token",
      is_db_backup_checked: false,
      launch_time: dayjs().toISOString(),
      git_hash: "",
      version: "",
    } satisfies ServerState;

    app.post("/keyshare/v2/commit", commit);

    // Mount keyshare v2 routes with commit-reveal middleware + mock OAuth
    app.post(
      "/keyshare/v2",
      commitRevealMiddleware("get_key_shares"),
      mockOAuthMiddleware,
      getKeysharesV2,
    );

    app.post(
      "/keyshare/v2/register",
      commitRevealMiddleware("register"),
      mockOAuthMiddleware,
      keyshareV2Register,
    );

    app.post(
      "/keyshare/v2/register/ed25519",
      commitRevealMiddleware("register_ed25519"),
      mockOAuthMiddleware,
      registerKeyshareEd25519,
    );

    app.post(
      "/keyshare/v2/reshare",
      commitRevealMiddleware("reshare"),
      mockOAuthMiddleware,
      keyshareV2Reshare,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("sign_up flow (commit → register)", () => {
    it("should complete full sign_up flow: commit → register → verify data", async () => {
      const ctx = createE2ETestContext({ operationType: "sign_up" });
      const idTokenHash = computeIdTokenHash(ctx.authType, ctx.idToken);

      // Step 1: Commit
      const commitResponse = await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: ctx.sessionId,
          operation_type: ctx.operationType,
          client_ephemeral_pubkey: ctx.clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        })
        .expect(200);

      expect(commitResponse.body.success).toBe(true);
      expect(commitResponse.body.data.node_pubkey).toBe(
        mockServerKeypair.publicKey.toHex(),
      );

      // Step 2: Register with commit-reveal signature
      const registerSignature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
        "register",
      );

      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      const registerResponse = await request(app)
        .post("/keyshare/v2/register")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .set("x-mock-user-id", ctx.userIdentifier)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: registerSignature,
          auth_type: ctx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: secp256k1Share,
            },
            ed25519: {
              public_key: TEST_ED25519_PK,
              share: ed25519Share,
            },
          },
        })
        .expect(200);

      expect(registerResponse.body.success).toBe(true);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 3: Verify session is COMPLETED
      const sessionRes = await getCommitRevealSessionBySessionId(
        pool,
        ctx.sessionId,
      );
      expect(sessionRes.success).toBe(true);
      if (sessionRes.success) {
        expect(sessionRes.data?.state).toBe("COMPLETED");
      }

      // Step 4: Verify key shares were persisted
      const secp256k1PkBytes = Bytes.fromHexString(TEST_SECP256K1_PK, 33);
      const ed25519PkBytes = Bytes.fromHexString(TEST_ED25519_PK, 32);
      if (!secp256k1PkBytes.success || !ed25519PkBytes.success) {
        throw new Error("Failed to parse public keys");
      }

      const checkResult = await checkKeyShareV2(pool, {
        user_auth_id: ctx.userIdentifier,
        auth_type: ctx.authType as "google",
        wallets: {
          secp256k1: secp256k1PkBytes.data,
          ed25519: ed25519PkBytes.data,
        },
      });

      expect(checkResult.success).toBe(true);
      if (checkResult.success) {
        expect(checkResult.data.secp256k1?.exists).toBe(true);
        expect(checkResult.data.ed25519?.exists).toBe(true);
      }
    });

    it("should reject replay attack on register API", async () => {
      const ctx = createE2ETestContext({ operationType: "sign_up" });
      const idTokenHash = computeIdTokenHash(ctx.authType, ctx.idToken);

      // Commit
      await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: ctx.sessionId,
          operation_type: ctx.operationType,
          client_ephemeral_pubkey: ctx.clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        })
        .expect(200);

      // First register call
      const registerSignature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
        "register",
      );

      await request(app)
        .post("/keyshare/v2/register")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .set("x-mock-user-id", ctx.userIdentifier)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: registerSignature,
          auth_type: ctx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: generateRandomShare(),
            },
            ed25519: {
              public_key: TEST_ED25519_PK,
              share: generateRandomShare(),
            },
          },
        })
        .expect(200);

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second register call with same session should fail
      // Session is now COMPLETED, so it fails with INVALID_REQUEST (not COMMITTED state)
      const response = await request(app)
        .post("/keyshare/v2/register")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .set("x-mock-user-id", ctx.userIdentifier)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: registerSignature,
          auth_type: ctx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: generateRandomShare(),
            },
            ed25519: {
              public_key: TEST_ED25519_PK,
              share: generateRandomShare(),
            },
          },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("COMMITTED");
    });
  });

  describe("sign_in flow (commit → get_key_shares)", () => {
    it("should complete full sign_in flow: register → commit → get_key_shares", async () => {
      // First, register a user (using sign_up flow)
      const signUpCtx = createE2ETestContext({ operationType: "sign_up" });
      const signUpIdTokenHash = computeIdTokenHash(
        signUpCtx.authType,
        signUpCtx.idToken,
      );

      // Commit for sign_up
      await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: signUpCtx.sessionId,
          operation_type: signUpCtx.operationType,
          client_ephemeral_pubkey: signUpCtx.clientKeypair.publicKey.toHex(),
          id_token_hash: signUpIdTokenHash,
        })
        .expect(200);

      // Register
      const registerSignature = createRevealSignature(
        signUpCtx,
        mockServerKeypair.publicKey.toHex(),
        "register",
      );

      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      await request(app)
        .post("/keyshare/v2/register")
        .set("Authorization", `Bearer ${signUpCtx.idToken}`)
        .set("x-mock-user-id", signUpCtx.userIdentifier)
        .send({
          cr_session_id: signUpCtx.sessionId,
          cr_signature: registerSignature,
          auth_type: signUpCtx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: secp256k1Share,
            },
            ed25519: {
              public_key: TEST_ED25519_PK,
              share: ed25519Share,
            },
          },
        })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now sign_in flow
      const signInCtx = createE2ETestContext({
        operationType: "sign_in",
        userIdentifier: signUpCtx.userIdentifier, // Same user
      });
      const signInIdTokenHash = computeIdTokenHash(
        signInCtx.authType,
        signInCtx.idToken,
      );

      // Commit for sign_in
      await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: signInCtx.sessionId,
          operation_type: signInCtx.operationType,
          client_ephemeral_pubkey: signInCtx.clientKeypair.publicKey.toHex(),
          id_token_hash: signInIdTokenHash,
        })
        .expect(200);

      // Get key shares
      const getSignature = createRevealSignature(
        signInCtx,
        mockServerKeypair.publicKey.toHex(),
        "get_key_shares",
      );

      const getResponse = await request(app)
        .post("/keyshare/v2")
        .set("Authorization", `Bearer ${signInCtx.idToken}`)
        .set("x-mock-user-id", signInCtx.userIdentifier)
        .send({
          cr_session_id: signInCtx.sessionId,
          cr_signature: getSignature,
          auth_type: signInCtx.authType,
          wallets: {
            secp256k1: TEST_SECP256K1_PK,
            ed25519: TEST_ED25519_PK,
          },
        })
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.secp256k1).toBeDefined();
      expect(getResponse.body.data.secp256k1.share).toBe(secp256k1Share);
      expect(getResponse.body.data.ed25519).toBeDefined();
      expect(getResponse.body.data.ed25519.share).toBe(ed25519Share);

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify sign_in session is COMPLETED
      const sessionRes = await getCommitRevealSessionBySessionId(
        pool,
        signInCtx.sessionId,
      );
      expect(sessionRes.success).toBe(true);
      if (sessionRes.success) {
        expect(sessionRes.data?.state).toBe("COMPLETED");
      }
    });
  });

  describe("sign_in_reshare flow (commit → get_key_shares → reshare)", () => {
    it("should complete sign_in_reshare flow with multiple API calls", async () => {
      // First, register a user
      const signUpCtx = createE2ETestContext({ operationType: "sign_up" });
      const signUpIdTokenHash = computeIdTokenHash(
        signUpCtx.authType,
        signUpCtx.idToken,
      );

      await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: signUpCtx.sessionId,
          operation_type: signUpCtx.operationType,
          client_ephemeral_pubkey: signUpCtx.clientKeypair.publicKey.toHex(),
          id_token_hash: signUpIdTokenHash,
        })
        .expect(200);

      const registerSignature = createRevealSignature(
        signUpCtx,
        mockServerKeypair.publicKey.toHex(),
        "register",
      );

      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      await request(app)
        .post("/keyshare/v2/register")
        .set("Authorization", `Bearer ${signUpCtx.idToken}`)
        .set("x-mock-user-id", signUpCtx.userIdentifier)
        .send({
          cr_session_id: signUpCtx.sessionId,
          cr_signature: registerSignature,
          auth_type: signUpCtx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: secp256k1Share,
            },
            ed25519: {
              public_key: TEST_ED25519_PK,
              share: ed25519Share,
            },
          },
        })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now sign_in_reshare flow
      const reshareCtx = createE2ETestContext({
        operationType: "sign_in_reshare",
        userIdentifier: signUpCtx.userIdentifier,
      });
      const reshareIdTokenHash = computeIdTokenHash(
        reshareCtx.authType,
        reshareCtx.idToken,
      );

      // Commit for sign_in_reshare
      await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: reshareCtx.sessionId,
          operation_type: reshareCtx.operationType,
          client_ephemeral_pubkey: reshareCtx.clientKeypair.publicKey.toHex(),
          id_token_hash: reshareIdTokenHash,
        })
        .expect(200);

      // Step 1: get_key_shares (non-final API)
      const getSignature = createRevealSignature(
        reshareCtx,
        mockServerKeypair.publicKey.toHex(),
        "get_key_shares",
      );

      await request(app)
        .post("/keyshare/v2")
        .set("Authorization", `Bearer ${reshareCtx.idToken}`)
        .set("x-mock-user-id", reshareCtx.userIdentifier)
        .send({
          cr_session_id: reshareCtx.sessionId,
          cr_signature: getSignature,
          auth_type: reshareCtx.authType,
          wallets: {
            secp256k1: TEST_SECP256K1_PK,
          },
        })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify session is still COMMITTED (get_key_shares is not final for sign_in_reshare)
      let sessionRes = await getCommitRevealSessionBySessionId(
        pool,
        reshareCtx.sessionId,
      );
      expect(sessionRes.success).toBe(true);
      if (sessionRes.success) {
        expect(sessionRes.data?.state).toBe("COMMITTED");
      }

      // Step 2: reshare (final API)
      const reshareSignature = createRevealSignature(
        reshareCtx,
        mockServerKeypair.publicKey.toHex(),
        "reshare",
      );

      await request(app)
        .post("/keyshare/v2/reshare")
        .set("Authorization", `Bearer ${reshareCtx.idToken}`)
        .set("x-mock-user-id", reshareCtx.userIdentifier)
        .send({
          cr_session_id: reshareCtx.sessionId,
          cr_signature: reshareSignature,
          auth_type: reshareCtx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: secp256k1Share, // Must match the original share
            },
          },
        })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify session is now COMPLETED
      sessionRes = await getCommitRevealSessionBySessionId(
        pool,
        reshareCtx.sessionId,
      );
      expect(sessionRes.success).toBe(true);
      if (sessionRes.success) {
        expect(sessionRes.data?.state).toBe("COMPLETED");
      }
    });
  });

  describe("add_ed25519 flow (commit → register_ed25519 → get_key_shares)", () => {
    it("should reject adding same ed25519 public key twice", async () => {
      // First, sign up with both wallets
      const signUpCtx = createE2ETestContext({ operationType: "sign_up" });
      const signUpIdTokenHash = computeIdTokenHash(
        signUpCtx.authType,
        signUpCtx.idToken,
      );

      await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: signUpCtx.sessionId,
          operation_type: signUpCtx.operationType,
          client_ephemeral_pubkey: signUpCtx.clientKeypair.publicKey.toHex(),
          id_token_hash: signUpIdTokenHash,
        })
        .expect(200);

      const registerSignature = createRevealSignature(
        signUpCtx,
        mockServerKeypair.publicKey.toHex(),
        "register",
      );

      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      await request(app)
        .post("/keyshare/v2/register")
        .set("Authorization", `Bearer ${signUpCtx.idToken}`)
        .set("x-mock-user-id", signUpCtx.userIdentifier)
        .send({
          cr_session_id: signUpCtx.sessionId,
          cr_signature: registerSignature,
          auth_type: signUpCtx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: secp256k1Share,
            },
            ed25519: {
              public_key: TEST_ED25519_PK,
              share: ed25519Share,
            },
          },
        })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now try to add the SAME ed25519 public key again
      const addEd25519Ctx = createE2ETestContext({
        operationType: "add_ed25519",
        userIdentifier: signUpCtx.userIdentifier,
      });
      const addEd25519IdTokenHash = computeIdTokenHash(
        addEd25519Ctx.authType,
        addEd25519Ctx.idToken,
      );

      // Commit for add_ed25519
      await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: addEd25519Ctx.sessionId,
          operation_type: addEd25519Ctx.operationType,
          client_ephemeral_pubkey:
            addEd25519Ctx.clientKeypair.publicKey.toHex(),
          id_token_hash: addEd25519IdTokenHash,
        })
        .expect(200);

      // Try to register_ed25519 with the SAME public key (should fail)
      const registerEd25519Signature = createRevealSignature(
        addEd25519Ctx,
        mockServerKeypair.publicKey.toHex(),
        "register_ed25519",
      );

      const newEd25519Share = generateRandomShare();

      // This should fail with DUPLICATE_PUBLIC_KEY because the public key already exists
      const response = await request(app)
        .post("/keyshare/v2/register/ed25519")
        .set("Authorization", `Bearer ${addEd25519Ctx.idToken}`)
        .set("x-mock-user-id", addEd25519Ctx.userIdentifier)
        .send({
          cr_session_id: addEd25519Ctx.sessionId,
          cr_signature: registerEd25519Signature,
          auth_type: addEd25519Ctx.authType,
          public_key: TEST_ED25519_PK, // Same public key as before
          share: newEd25519Share,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("DUPLICATE_PUBLIC_KEY");
    });
  });

  describe("error scenarios", () => {
    it("should reject request with invalid signature", async () => {
      const ctx = createE2ETestContext({ operationType: "sign_up" });
      const idTokenHash = computeIdTokenHash(ctx.authType, ctx.idToken);

      // Commit
      await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: ctx.sessionId,
          operation_type: ctx.operationType,
          client_ephemeral_pubkey: ctx.clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        })
        .expect(200);

      // Try to register with invalid signature
      const response = await request(app)
        .post("/keyshare/v2/register")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .set("x-mock-user-id", ctx.userIdentifier)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: "a".repeat(128), // Invalid signature
          auth_type: ctx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: generateRandomShare(),
            },
            ed25519: {
              public_key: TEST_ED25519_PK,
              share: generateRandomShare(),
            },
          },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should reject request with expired session", async () => {
      const ctx = createE2ETestContext({ operationType: "sign_up" });
      const idTokenHash = computeIdTokenHash(ctx.authType, ctx.idToken);

      // Commit
      await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: ctx.sessionId,
          operation_type: ctx.operationType,
          client_ephemeral_pubkey: ctx.clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        })
        .expect(200);

      // Manually expire the session
      await pool.query(
        "UPDATE \"2_commit_reveal_sessions\" SET expires_at = NOW() - INTERVAL '1 minute' WHERE session_id = $1",
        [ctx.sessionId],
      );

      // Try to register with expired session
      const registerSignature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
        "register",
      );

      const response = await request(app)
        .post("/keyshare/v2/register")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .set("x-mock-user-id", ctx.userIdentifier)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: registerSignature,
          auth_type: ctx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: generateRandomShare(),
            },
            ed25519: {
              public_key: TEST_ED25519_PK,
              share: generateRandomShare(),
            },
          },
        })
        .expect(410);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("SESSION_EXPIRED");
    });

    it("should reject request with non-existent session", async () => {
      const ctx = createE2ETestContext({ operationType: "sign_up" });

      // Don't commit, try to register directly
      const registerSignature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
        "register",
      );

      const response = await request(app)
        .post("/keyshare/v2/register")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .set("x-mock-user-id", ctx.userIdentifier)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: registerSignature,
          auth_type: ctx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: generateRandomShare(),
            },
            ed25519: {
              public_key: TEST_ED25519_PK,
              share: generateRandomShare(),
            },
          },
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("SESSION_NOT_FOUND");
    });

    it("should reject request with wrong operation type for API", async () => {
      const ctx = createE2ETestContext({
        operationType: "sign_in", // sign_in only allows get_key_shares
      });
      const idTokenHash = computeIdTokenHash(ctx.authType, ctx.idToken);

      // Commit with sign_in operation
      await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: ctx.sessionId,
          operation_type: ctx.operationType,
          client_ephemeral_pubkey: ctx.clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        })
        .expect(200);

      // Try to call register (not allowed for sign_in)
      const registerSignature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
        "register",
      );

      const response = await request(app)
        .post("/keyshare/v2/register")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .set("x-mock-user-id", ctx.userIdentifier)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: registerSignature,
          auth_type: ctx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: generateRandomShare(),
            },
            ed25519: {
              public_key: TEST_ED25519_PK,
              share: generateRandomShare(),
            },
          },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("not allowed");
    });

    it("should reject id_token_hash mismatch", async () => {
      const ctx = createE2ETestContext({ operationType: "sign_up" });
      const idTokenHash = computeIdTokenHash(ctx.authType, ctx.idToken);

      // Commit
      await request(app)
        .post("/keyshare/v2/commit")
        .send({
          session_id: ctx.sessionId,
          operation_type: ctx.operationType,
          client_ephemeral_pubkey: ctx.clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        })
        .expect(200);

      // Try to register with different id_token
      const registerSignature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
        "register",
      );

      const response = await request(app)
        .post("/keyshare/v2/register")
        .set("Authorization", "Bearer different_token") // Different token
        .set("x-mock-user-id", ctx.userIdentifier)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: registerSignature,
          auth_type: ctx.authType,
          wallets: {
            secp256k1: {
              public_key: TEST_SECP256K1_PK,
              share: generateRandomShare(),
            },
            ed25519: {
              public_key: TEST_ED25519_PK,
              share: generateRandomShare(),
            },
          },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("id_token_hash mismatch");
    });
  });
});
