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
import type { OperationType } from "@oko-wallet/ksn-interface/commit_reveal";
import {
  createCommitRevealSession,
  getCommitRevealSessionBySessionId,
  hasCommitRevealApiBeenCalled,
} from "@oko-wallet/ksn-pg-interface/commit_reveal";

import { connectPG, resetPgDatabase } from "@oko-wallet-ksn-server/database";
import { testPgConfig } from "@oko-wallet-ksn-server/database/test_config";
import { commitRevealMiddleware } from "./commit_reveal";
import type { ServerState } from "@oko-wallet-ksn-server/state";

// Mock server keypair
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

interface TestContext {
  sessionId: string;
  clientKeypair: {
    privateKey: Bytes<32>;
    publicKey: Bytes<32>;
  };
  idToken: string;
  authType: string;
  operationType: OperationType;
  apiName: string;
}

function createTestContext(overrides: Partial<TestContext> = {}): TestContext {
  const keypairRes = generateEddsaKeypair();
  if (!keypairRes.success) {
    throw new Error(`Failed to generate keypair: ${keypairRes.err}`);
  }

  return {
    sessionId: uuidv4(),
    clientKeypair: keypairRes.data,
    idToken: `test_id_token_${Date.now()}`,
    authType: "google",
    operationType: "sign_in",
    apiName: "get_key_shares",
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
  ctx: TestContext,
  nodePubkeyHex: string,
): string {
  const message = `${nodePubkeyHex}${ctx.sessionId}${ctx.authType}${ctx.idToken}${ctx.operationType}${ctx.apiName}`;
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

async function createSession(
  pool: Pool,
  ctx: TestContext,
  options: { expiresInMs?: number; state?: string } = {},
) {
  const idTokenHash = computeIdTokenHash(ctx.authType, ctx.idToken);
  const expiresAt = new Date(
    Date.now() + (options.expiresInMs ?? 5 * 60 * 1000),
  );

  const result = await createCommitRevealSession(pool, {
    session_id: ctx.sessionId,
    operation_type: ctx.operationType,
    client_ephemeral_pubkey: ctx.clientKeypair.publicKey.toUint8Array(),
    id_token_hash: idTokenHash,
    expires_at: expiresAt,
  });

  if (!result.success) {
    throw new Error(`Failed to create session: ${result.err}`);
  }

  // Update state if needed
  if (options.state && options.state !== "COMMITTED") {
    await pool.query(
      'UPDATE "2_commit_reveal_sessions" SET state = $1 WHERE session_id = $2',
      [options.state, ctx.sessionId],
    );
  }

  return result.data;
}

describe("commit_reveal_middleware_test", () => {
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
      encryptionSecret: "temp_enc_secret",
      serverKeypair: mockServerKeypair,
      telegram_bot_token: "temp_telegram_bot_token",
      is_db_backup_checked: false,
      launch_time: dayjs().toISOString(),
      git_hash: "",
      version: "",
    } satisfies ServerState;

    // Add test route with middleware
    app.post(
      "/test/get_key_shares",
      commitRevealMiddleware("get_key_shares"),
      (_req, res) => {
        res.status(200).json({ success: true, data: { message: "ok" } });
      },
    );

    app.post(
      "/test/register",
      commitRevealMiddleware("register"),
      (_req, res) => {
        res.status(200).json({ success: true, data: { message: "ok" } });
      },
    );

    app.post(
      "/test/reshare",
      commitRevealMiddleware("reshare"),
      (_req, res) => {
        res.status(200).json({ success: true, data: { message: "ok" } });
      },
    );

    app.post(
      "/test/register_ed25519",
      commitRevealMiddleware("register_ed25519"),
      (_req, res) => {
        res.status(200).json({ success: true, data: { message: "ok" } });
      },
    );

    // Route that returns 500 to test failure behavior
    app.post(
      "/test/get_key_shares_fail",
      commitRevealMiddleware("get_key_shares"),
      (_req, res) => {
        res.status(500).json({
          success: false,
          code: "SERVER_ERROR",
          msg: "Simulated failure",
        });
      },
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("success cases", () => {
    it("should pass middleware with valid signature for sign_in operation", async () => {
      const ctx = createTestContext({
        operationType: "sign_in",
        apiName: "get_key_shares",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("ok");
    });

    it("should pass middleware with valid signature for sign_up operation", async () => {
      const ctx = createTestContext({
        operationType: "sign_up",
        apiName: "register",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/register")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should pass middleware with valid signature for reshare operation with reshare", async () => {
      const ctx = createTestContext({
        operationType: "reshare",
        apiName: "reshare",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/reshare")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should pass middleware with valid signature for reshare operation with get_key_shares", async () => {
      const ctx = createTestContext({
        operationType: "reshare",
        apiName: "get_key_shares",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should pass middleware with valid signature for add_ed25519 operation", async () => {
      const ctx = createTestContext({
        operationType: "add_ed25519",
        apiName: "register_ed25519",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/register_ed25519")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should pass middleware with valid signature for add_ed25519 operation with register_ed25519", async () => {
      const ctx = createTestContext({
        operationType: "add_ed25519",
        apiName: "register_ed25519",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/register_ed25519")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should default auth_type to google if not provided", async () => {
      const ctx = createTestContext({
        operationType: "sign_in",
        apiName: "get_key_shares",
        authType: "google", // Will be used for hash but not sent in request
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          // auth_type not provided, should default to "google"
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("missing required fields", () => {
    it("should return 400 when cr_session_id is missing", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("cr_session_id");
    });

    it("should return 400 when cr_signature is missing", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx);

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          auth_type: ctx.authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("cr_signature");
    });

    it("should return 401 when Authorization header is missing", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("UNAUTHORIZED");
    });
  });

  describe("session validation", () => {
    it("should return 404 when session does not exist", async () => {
      const ctx = createTestContext();
      // Don't create session

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("SESSION_NOT_FOUND");
    });

    it("should return 400 when session is not in COMMITTED state", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx, { state: "REVEALED" });

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("COMMITTED");
    });

    it("should return 410 when session has expired", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx, { expiresInMs: -1000 }); // Expired 1 second ago

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(410);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("SESSION_EXPIRED");
    });
  });

  describe("operation-api validation", () => {
    it("should return 400 when api is not allowed for operation", async () => {
      const ctx = createTestContext({
        operationType: "sign_in", // sign_in doesn't allow register_ed25519
        apiName: "register_ed25519", // register_ed25519 is for add_ed25519 only
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/register_ed25519") // Trying to call register_ed25519 with sign_in operation
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("not allowed");
    });

    it("should allow get_key_shares for sign_in operation", async () => {
      const ctx = createTestContext({
        operationType: "sign_in",
        apiName: "get_key_shares",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should allow get_key_shares for add_ed25519 operation", async () => {
      const ctx = createTestContext({
        operationType: "add_ed25519",
        apiName: "get_key_shares",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should allow register_ed25519 for add_ed25519 operation", async () => {
      const ctx = createTestContext({
        operationType: "add_ed25519",
        apiName: "register_ed25519",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/register_ed25519")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("id_token_hash validation", () => {
    it("should return 400 when id_token does not match committed hash", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx);

      // Create signature with correct token but send different token
      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", "Bearer wrong_token") // Different token
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("id_token_hash mismatch");
    });

    it("should return 400 when auth_type does not match committed hash", async () => {
      const ctx = createTestContext({ authType: "google" });
      await createSession(pool, ctx);

      // Create signature with google auth_type
      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: "apple", // Different auth_type
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("id_token_hash mismatch");
    });
  });

  describe("signature validation", () => {
    it("should return 400 when signature format is invalid", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx);

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: "invalid_hex",
          auth_type: ctx.authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should return 400 when signature is wrong length", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx);

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: "abcd1234", // Too short
          auth_type: ctx.authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should return 400 when signature is invalid (wrong message)", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx);

      // Sign with wrong message
      const wrongMessage = "wrong_message";
      const signRes = signMessage(wrongMessage, ctx.clientKeypair.privateKey);
      if (!signRes.success) {
        throw new Error(`Failed to sign: ${signRes.err}`);
      }
      const sigBytesRes = convertEddsaSignatureToBytes(signRes.data);
      if (!sigBytesRes.success) {
        throw new Error(`Failed to convert: ${sigBytesRes.err}`);
      }
      const wrongSignature = sigBytesRes.data.toHex();

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: wrongSignature,
          auth_type: ctx.authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should return 400 when signature is from different keypair", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx);

      // Generate different keypair and sign
      const otherKeypairRes = generateEddsaKeypair();
      if (!otherKeypairRes.success) {
        throw new Error("Failed to generate other keypair");
      }

      const message = `${mockServerKeypair.publicKey.toHex()}${ctx.sessionId}${ctx.authType}${ctx.idToken}${ctx.operationType}${ctx.apiName}`;
      const signRes = signMessage(message, otherKeypairRes.data.privateKey);
      if (!signRes.success) {
        throw new Error(`Failed to sign: ${signRes.err}`);
      }
      const sigBytesRes = convertEddsaSignatureToBytes(signRes.data);
      if (!sigBytesRes.success) {
        throw new Error(`Failed to convert: ${sigBytesRes.err}`);
      }
      const wrongSignature = sigBytesRes.data.toHex();

      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: wrongSignature,
          auth_type: ctx.authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_SIGNATURE");
    });
  });

  describe("replay attack prevention", () => {
    it("should record api_call on successful response", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(200);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify api_call was recorded
      const hasBeenCalled = await hasCommitRevealApiBeenCalled(
        pool,
        ctx.sessionId,
        ctx.apiName,
      );
      if (!hasBeenCalled.success) {
        throw new Error(`Failed to check api call: ${hasBeenCalled.err}`);
      }
      expect(hasBeenCalled.data).toBe(true);
    });

    it("should NOT record api_call on failed response (allows retry)", async () => {
      const ctx = createTestContext();
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      await request(app)
        .post("/test/get_key_shares_fail")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
        })
        .expect(500);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify api_call was NOT recorded (allows retry)
      const hasBeenCalled = await hasCommitRevealApiBeenCalled(
        pool,
        ctx.sessionId,
        ctx.apiName,
      );
      if (!hasBeenCalled.success) {
        throw new Error(`Failed to check api call: ${hasBeenCalled.err}`);
      }
      expect(hasBeenCalled.data).toBe(false);
    });

    it("should return 409 when same API is called twice with same session (pre-check)", async () => {
      // Use sign_in with cr_final: false so session stays COMMITTED after first call
      const ctx = createTestContext({
        operationType: "sign_in",
        apiName: "get_key_shares",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      // First call should succeed (cr_final: false keeps session COMMITTED)
      await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
          cr_final: false,
        })
        .expect(200);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second call should fail with API_ALREADY_CALLED (pre-check)
      const response = await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
          cr_final: false,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("API_ALREADY_CALLED");
    });

    it("should return 400 when same signature is reused for different API (signature mismatch)", async () => {
      // When trying to reuse a signature for a different API, the signature
      // verification fails first because the message includes the api_name.
      // So this returns 400 INVALID_SIGNATURE, not 409.
      const ctx = createTestContext({
        operationType: "sign_in", // sign_in allows multiple APIs
        apiName: "get_key_shares",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      // First call to get_key_shares
      await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
          cr_final: false,
        })
        .expect(200);

      // Try to call reshare with same signature
      // This fails with INVALID_SIGNATURE because the signed message
      // includes api_name, which is different ("get_key_shares" vs "reshare")
      const response = await request(app)
        .post("/test/reshare")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature, // Same signature but api_name is different
          auth_type: ctx.authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should allow different APIs with different signatures for sign_in operation", async () => {
      const ctx1 = createTestContext({
        operationType: "sign_in",
        apiName: "get_key_shares",
      });
      await createSession(pool, ctx1);

      const signature1 = createRevealSignature(
        ctx1,
        mockServerKeypair.publicKey.toHex(),
      );

      // First call to get_key_shares (cr_final: false)
      await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx1.idToken}`)
        .send({
          cr_session_id: ctx1.sessionId,
          cr_signature: signature1,
          auth_type: ctx1.authType,
          cr_final: false,
        })
        .expect(200);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create new signature for reshare API
      const ctx2 = {
        ...ctx1,
        apiName: "reshare",
      };
      const signature2 = createRevealSignature(
        ctx2,
        mockServerKeypair.publicKey.toHex(),
      );

      // Call reshare (cr_final: true) with different signature
      const response = await request(app)
        .post("/test/reshare")
        .set("Authorization", `Bearer ${ctx2.idToken}`)
        .send({
          cr_session_id: ctx2.sessionId,
          cr_signature: signature2,
          auth_type: ctx2.authType,
          cr_final: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("cr_final and session completion", () => {
    it("should update session to COMPLETED when cr_final is true for sign_in", async () => {
      const ctx = createTestContext({
        operationType: "sign_in",
        apiName: "get_key_shares",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
          cr_final: true,
        })
        .expect(200);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify session is COMPLETED
      const sessionRes = await getCommitRevealSessionBySessionId(
        pool,
        ctx.sessionId,
      );
      if (!sessionRes.success) {
        throw new Error(`Failed to get session: ${sessionRes.err}`);
      }
      expect(sessionRes.data?.state).toBe("COMPLETED");
    });

    it("should update session to COMPLETED when cr_final is true for sign_up", async () => {
      const ctx = createTestContext({
        operationType: "sign_up",
        apiName: "register",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      await request(app)
        .post("/test/register")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
          cr_final: true,
        })
        .expect(200);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify session is COMPLETED
      const sessionRes = await getCommitRevealSessionBySessionId(
        pool,
        ctx.sessionId,
      );
      if (!sessionRes.success) {
        throw new Error(`Failed to get session: ${sessionRes.err}`);
      }
      expect(sessionRes.data?.state).toBe("COMPLETED");
    });

    it("should NOT update session to COMPLETED when cr_final is false", async () => {
      const ctx = createTestContext({
        operationType: "sign_in",
        apiName: "get_key_shares",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
          cr_final: false,
        })
        .expect(200);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify session is still COMMITTED (not COMPLETED)
      const sessionRes = await getCommitRevealSessionBySessionId(
        pool,
        ctx.sessionId,
      );
      if (!sessionRes.success) {
        throw new Error(`Failed to get session: ${sessionRes.err}`);
      }
      expect(sessionRes.data?.state).toBe("COMMITTED");
    });

    it("should update session to COMPLETED when cr_final is true for sign_in with reshare", async () => {
      const ctx = createTestContext({
        operationType: "sign_in",
        apiName: "reshare",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      await request(app)
        .post("/test/reshare")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
          cr_final: true,
        })
        .expect(200);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify session is COMPLETED
      const sessionRes = await getCommitRevealSessionBySessionId(
        pool,
        ctx.sessionId,
      );
      if (!sessionRes.success) {
        throw new Error(`Failed to get session: ${sessionRes.err}`);
      }
      expect(sessionRes.data?.state).toBe("COMPLETED");
    });

    it("should update session to COMPLETED when cr_final is true for add_ed25519", async () => {
      const ctx = createTestContext({
        operationType: "add_ed25519",
        apiName: "register_ed25519",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      await request(app)
        .post("/test/register_ed25519")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
          cr_final: true,
        })
        .expect(200);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify session is COMPLETED
      const sessionRes = await getCommitRevealSessionBySessionId(
        pool,
        ctx.sessionId,
      );
      if (!sessionRes.success) {
        throw new Error(`Failed to get session: ${sessionRes.err}`);
      }
      expect(sessionRes.data?.state).toBe("COMPLETED");
    });

    it("should NOT update session to COMPLETED when cr_final is false for add_ed25519", async () => {
      const ctx = createTestContext({
        operationType: "add_ed25519",
        apiName: "get_key_shares",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      await request(app)
        .post("/test/get_key_shares")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
          cr_final: false,
        })
        .expect(200);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify session is still COMMITTED (not COMPLETED)
      const sessionRes = await getCommitRevealSessionBySessionId(
        pool,
        ctx.sessionId,
      );
      if (!sessionRes.success) {
        throw new Error(`Failed to get session: ${sessionRes.err}`);
      }
      expect(sessionRes.data?.state).toBe("COMMITTED");
    });

    it("should NOT update session to COMPLETED when API fails even with cr_final true", async () => {
      const ctx = createTestContext({
        operationType: "sign_in",
        apiName: "get_key_shares",
      });
      await createSession(pool, ctx);

      const signature = createRevealSignature(
        ctx,
        mockServerKeypair.publicKey.toHex(),
      );

      await request(app)
        .post("/test/get_key_shares_fail")
        .set("Authorization", `Bearer ${ctx.idToken}`)
        .send({
          cr_session_id: ctx.sessionId,
          cr_signature: signature,
          auth_type: ctx.authType,
          cr_final: true,
        })
        .expect(500);

      // Wait for res.on('finish') to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify session is still COMMITTED (not COMPLETED)
      const sessionRes = await getCommitRevealSessionBySessionId(
        pool,
        ctx.sessionId,
      );
      if (!sessionRes.success) {
        throw new Error(`Failed to get session: ${sessionRes.err}`);
      }
      expect(sessionRes.data?.state).toBe("COMMITTED");
    });
  });
});
