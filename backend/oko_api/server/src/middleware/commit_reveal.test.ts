import request from "supertest";
import express from "express";
import type { Pool } from "pg";
import { Bytes } from "@oko-wallet/bytes";
import { randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { createPgConn } from "@oko-wallet/postgres-lib";
import winston from "winston";
import { sha256 } from "@oko-wallet/crypto-js";
import {
  generateEddsaKeypair,
  signMessage,
  convertEddsaSignatureToBytes,
} from "@oko-wallet/crypto-js/node/ecdhe";

import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";
import { commitRevealMiddleware } from "./commit_reveal";

// Mock keypair for testing
const privateKeyRes = Bytes.fromHexString(
  "0000000000000000000000000000000000000000000000000000000000000001",
  32,
);
const publicKeyRes = Bytes.fromHexString(
  "0000000000000000000000000000000000000000000000000000000000000002",
  32,
);
if (!privateKeyRes.success || !publicKeyRes.success) {
  throw new Error("Failed to create mock keypair");
}
const mockServerKeypair = {
  privateKey: privateKeyRes.data,
  publicKey: publicKeyRes.data,
};

const testLogger = winston.createLogger({
  level: "error",
  silent: true,
  transports: [new winston.transports.Console()],
});

function generateRandomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

describe("commit_reveal_middleware_test", () => {
  let pool: Pool;
  let app: express.Application;

  beforeAll(async () => {
    const config = testPgConfig;
    const createPostgresRes = await createPgConn({
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

    app = express();
    app.use(express.json());

    // Test routes with middleware
    app.post("/test/keygen", commitRevealMiddleware("keygen"), (_req, res) => {
      res.status(200).json({ success: true, data: { message: "keygen ok" } });
    });
    app.post("/test/signin", commitRevealMiddleware("signin"), (_req, res) => {
      res.status(200).json({ success: true, data: { message: "signin ok" } });
    });

    app.locals.db = pool;
    app.locals.server_keypair = mockServerKeypair;
    app.locals.logger = testLogger;
  });

  beforeEach(async () => {
    await resetPgDatabase(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  // Helper to create a session directly in DB
  async function createSession(params: {
    session_id: string;
    operation_type: string;
    client_ephemeral_pubkey: string;
    id_token_hash: string;
    state?: string;
    expires_at?: Date;
  }) {
    const expiresAt = params.expires_at ?? new Date(Date.now() + 5 * 60 * 1000);
    const state = params.state ?? "COMMITTED";

    await pool.query(
      `INSERT INTO "commit_reveal_sessions" (session_id, operation_type, client_ephemeral_pubkey, id_token_hash, state, expires_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.session_id,
        params.operation_type,
        Buffer.from(params.client_ephemeral_pubkey, "hex"),
        params.id_token_hash,
        state,
        expiresAt,
      ],
    );
  }

  describe("missing required fields", () => {
    it("should return 400 when cr_session_id is missing", async () => {
      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", "Bearer test_token")
        .send({
          cr_signature: generateRandomHex(64),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("cr_session_id");
    });

    it("should return 400 when cr_signature is missing", async () => {
      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", "Bearer test_token")
        .send({
          cr_session_id: uuidv4(),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("cr_signature");
    });

    it("should return 401 when Authorization header is missing", async () => {
      const sessionId = uuidv4();
      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: generateRandomHex(32),
        id_token_hash: generateRandomHex(32),
      });

      const response = await request(app)
        .post("/test/keygen")
        .send({
          cr_session_id: sessionId,
          cr_signature: generateRandomHex(64),
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("UNAUTHORIZED");
    });
  });

  describe("session validation", () => {
    it("should return 404 when session does not exist", async () => {
      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", "Bearer test_token")
        .send({
          cr_session_id: uuidv4(),
          cr_signature: generateRandomHex(64),
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("SESSION_NOT_FOUND");
    });

    it("should return 400 when session is not in COMMITTED state", async () => {
      const sessionId = uuidv4();
      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: generateRandomHex(32),
        id_token_hash: generateRandomHex(32),
        state: "COMPLETED",
      });

      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", "Bearer test_token")
        .send({
          cr_session_id: sessionId,
          cr_signature: generateRandomHex(64),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("COMMITTED");
    });

    it("should return 410 when session has expired", async () => {
      const sessionId = uuidv4();
      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: generateRandomHex(32),
        id_token_hash: generateRandomHex(32),
        expires_at: new Date(Date.now() - 1000), // expired 1 second ago
      });

      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", "Bearer test_token")
        .send({
          cr_session_id: sessionId,
          cr_signature: generateRandomHex(64),
        })
        .expect(410);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("SESSION_EXPIRED");
    });
  });

  describe("operation-API validation", () => {
    it("should return 400 when API is not allowed for operation", async () => {
      const sessionId = uuidv4();
      // Create session with sign_in operation
      await createSession({
        session_id: sessionId,
        operation_type: "sign_in",
        client_ephemeral_pubkey: generateRandomHex(32),
        id_token_hash: generateRandomHex(32),
      });

      // Try to call keygen API (not allowed for sign_in)
      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", "Bearer test_token")
        .send({
          cr_session_id: sessionId,
          cr_signature: generateRandomHex(64),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("keygen");
      expect(response.body.msg).toContain("sign_in");
    });

    it("should return 400 when sign_in operation tries to call keygen", async () => {
      const sessionId = uuidv4();
      await createSession({
        session_id: sessionId,
        operation_type: "sign_in",
        client_ephemeral_pubkey: generateRandomHex(32),
        id_token_hash: generateRandomHex(32),
      });

      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", "Bearer test_token")
        .send({
          cr_session_id: sessionId,
          cr_signature: generateRandomHex(64),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
    });

    it("should return 400 when sign_up operation tries to call signin", async () => {
      const sessionId = uuidv4();
      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: generateRandomHex(32),
        id_token_hash: generateRandomHex(32),
      });

      const response = await request(app)
        .post("/test/signin")
        .set("Authorization", "Bearer test_token")
        .send({
          cr_session_id: sessionId,
          cr_signature: generateRandomHex(64),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("signin");
      expect(response.body.msg).toContain("sign_up");
    });
  });

  describe("id_token_hash validation", () => {
    it("should return 400 when id_token does not match committed hash", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const originalIdToken = "original_id_token";
      const wrongIdToken = "wrong_id_token";

      // Compute hash with original token
      const hashRes = sha256(`${authType}${originalIdToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }
      const idTokenHash = hashRes.data.toHex();

      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: generateRandomHex(32),
        id_token_hash: idTokenHash,
      });

      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", `Bearer ${wrongIdToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: generateRandomHex(64),
          auth_type: authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("id_token_hash mismatch");
    });

    it("should return 400 when auth_type does not match committed hash", async () => {
      const sessionId = uuidv4();
      const originalAuthType = "google";
      const wrongAuthType = "auth0";
      const idToken = "test_id_token";

      // Compute hash with original auth_type
      const hashRes = sha256(`${originalAuthType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }
      const idTokenHash = hashRes.data.toHex();

      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: generateRandomHex(32),
        id_token_hash: idTokenHash,
      });

      // Send with wrong auth_type
      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: generateRandomHex(64),
          auth_type: wrongAuthType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("id_token_hash mismatch");
    });
  });

  describe("signature validation", () => {
    it("should return 400 when signature format is invalid hex", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: generateRandomHex(32),
        id_token_hash: hashRes.data.toHex(),
      });

      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: "invalid_hex_signature_not_valid",
          auth_type: authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should return 400 when signature length is wrong", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: generateRandomHex(32),
        id_token_hash: hashRes.data.toHex(),
      });

      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: generateRandomHex(32), // 32 bytes instead of 64
          auth_type: authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should return 400 when signature verification fails (wrong message)", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      // Generate client keypair
      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      // Sign wrong message
      const wrongMessage = "wrong_message";
      const signRes = signMessage(wrongMessage, clientKeypair.privateKey);
      if (!signRes.success) {
      throw new Error("Failed to sign message");
    }

      const sigBytesRes = convertEddsaSignatureToBytes(signRes.data);
      if (!sigBytesRes.success) {
      throw new Error("Failed to convert signature");
    }

      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: sigBytesRes.data.toHex(),
          auth_type: authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should return 400 when signed with different keypair", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      // Generate two different keypairs
      const clientKeypairRes = generateEddsaKeypair();
      const wrongKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success || !wrongKeypairRes.success) {
        throw new Error("Failed to generate keypairs");
      }
      const clientKeypair = clientKeypairRes.data;
      const wrongKeypair = wrongKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      // Create session with client keypair
      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      // Create correct message but sign with wrong keypair
      const nodePubkeyHex = mockServerKeypair.publicKey.toHex();
      const message = `${nodePubkeyHex}${sessionId}${authType}${idToken}sign_upkeygen`;
      const signRes = signMessage(message, wrongKeypair.privateKey);
      if (!signRes.success) {
      throw new Error("Failed to sign message");
    }

      const sigBytesRes = convertEddsaSignatureToBytes(signRes.data);
      if (!sigBytesRes.success) {
      throw new Error("Failed to convert signature");
    }

      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: sigBytesRes.data.toHex(),
          auth_type: authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_SIGNATURE");
    });
  });

  describe("auth_type handling", () => {
    it("should use google as default when auth_type is not provided", async () => {
      const sessionId = uuidv4();
      const idToken = "test_id_token";

      // Compute hash with google as auth_type (default)
      const hashRes = sha256(`google${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      // Generate client keypair
      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      // Create correct message with google as auth_type
      const nodePubkeyHex = mockServerKeypair.publicKey.toHex();
      const message = `${nodePubkeyHex}${sessionId}google${idToken}sign_upkeygen`;
      const signRes = signMessage(message, clientKeypair.privateKey);
      if (!signRes.success) {
      throw new Error("Failed to sign message");
    }

      const sigBytesRes = convertEddsaSignatureToBytes(signRes.data);
      if (!sigBytesRes.success) {
      throw new Error("Failed to convert signature");
    }

      // Send without auth_type - should default to google
      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: sigBytesRes.data.toHex(),
          // auth_type not provided
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

describe("commit_reveal_middleware_replay_and_session_test", () => {
  let pool: Pool;
  let app: express.Application;

  beforeAll(async () => {
    const config = testPgConfig;
    const createPostgresRes = await createPgConn({
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

    app = express();
    app.use(express.json());

    // Final API routes (keygen for sign_up, signin for sign_in)
    app.post("/test/keygen", commitRevealMiddleware("keygen"), (_req, res) => {
      res.status(200).json({ success: true, data: { message: "keygen ok" } });
    });
    app.post("/test/signin", commitRevealMiddleware("signin"), (_req, res) => {
      res.status(200).json({ success: true, data: { message: "signin ok" } });
    });
    app.post(
      "/test/reshare",
      commitRevealMiddleware("reshare"),
      (_req, res) => {
        res
          .status(200)
          .json({ success: true, data: { message: "reshare ok" } });
      },
    );
    app.post(
      "/test/keygen_ed25519",
      commitRevealMiddleware("keygen_ed25519"),
      (_req, res) => {
        res
          .status(200)
          .json({ success: true, data: { message: "keygen_ed25519 ok" } });
      },
    );

    // Route that fails
    app.post(
      "/test/keygen_fail",
      commitRevealMiddleware("keygen"),
      (_req, res) => {
        res
          .status(500)
          .json({
            success: false,
            code: "INTERNAL_ERROR",
            msg: "Simulated failure",
          });
      },
    );

    app.locals.db = pool;
    app.locals.server_keypair = mockServerKeypair;
    app.locals.logger = testLogger;
  });

  beforeEach(async () => {
    await resetPgDatabase(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createSession(params: {
    session_id: string;
    operation_type: string;
    client_ephemeral_pubkey: string;
    id_token_hash: string;
    state?: string;
    expires_at?: Date;
  }) {
    const expiresAt = params.expires_at ?? new Date(Date.now() + 5 * 60 * 1000);
    const state = params.state ?? "COMMITTED";

    await pool.query(
      `INSERT INTO "commit_reveal_sessions" (session_id, operation_type, client_ephemeral_pubkey, id_token_hash, state, expires_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.session_id,
        params.operation_type,
        Buffer.from(params.client_ephemeral_pubkey, "hex"),
        params.id_token_hash,
        state,
        expiresAt,
      ],
    );
  }

  async function getSessionState(sessionId: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT state FROM "commit_reveal_sessions" WHERE session_id = $1`,
      [sessionId],
    );
    return result.rows[0]?.state ?? null;
  }

  async function getApiCallCount(
    sessionId: string,
    apiName: string,
  ): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM "commit_reveal_api_calls" WHERE session_id = $1 AND api_name = $2`,
      [sessionId, apiName],
    );
    return parseInt(result.rows[0].count, 10);
  }

  function createValidSignature(
    clientKeypair: { privateKey: Bytes<32>; publicKey: Bytes<32> },
    sessionId: string,
    authType: string,
    idToken: string,
    operationType: string,
    apiName: string,
  ): string {
    const nodePubkeyHex = mockServerKeypair.publicKey.toHex();
    const message = `${nodePubkeyHex}${sessionId}${authType}${idToken}${operationType}${apiName}`;
    const signRes = signMessage(message, clientKeypair.privateKey);
    if (!signRes.success) {
      throw new Error("Failed to sign message");
    }

    const sigBytesRes = convertEddsaSignatureToBytes(signRes.data);
    if (!sigBytesRes.success) {
      throw new Error("Failed to convert signature");
    }

    return sigBytesRes.data.toHex();
  }

  describe("replay attack prevention", () => {
    it("should record api_call on successful response", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_up",
        "keygen",
      );

      // Before call: no api_call record
      expect(await getApiCallCount(sessionId, "keygen")).toBe(0);

      await request(app)
        .post("/test/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(200);

      // Wait for async finish handler
      await new Promise((resolve) => setTimeout(resolve, 100));

      // After call: api_call recorded
      expect(await getApiCallCount(sessionId, "keygen")).toBe(1);
    });

    it("should not record api_call on failed response (retry allowed)", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_up",
        "keygen",
      );

      await request(app)
        .post("/test/keygen_fail")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(500);

      // Wait for async finish handler
      await new Promise((resolve) => setTimeout(resolve, 100));

      // api_call should not be recorded on failure
      expect(await getApiCallCount(sessionId, "keygen")).toBe(0);
    });

    it("should return 409 when same API called twice with same session", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "sign_in",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_in",
        "signin",
      );

      // First call succeeds
      await request(app)
        .post("/test/signin")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(200);

      // Wait for async finish handler
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reset session state to COMMITTED to allow second call attempt
      await pool.query(
        `UPDATE "commit_reveal_sessions" SET state = 'COMMITTED' WHERE session_id = $1`,
        [sessionId],
      );

      // Second call with same signature should fail
      const response = await request(app)
        .post("/test/signin")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("API_ALREADY_CALLED");
    });
  });

  describe("FINAL_APIS and session completion", () => {
    it("should change session to COMPLETED when calling final API (keygen for sign_up)", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_up",
        "keygen",
      );

      // Before: COMMITTED
      expect(await getSessionState(sessionId)).toBe("COMMITTED");

      await request(app)
        .post("/test/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(200);

      // Wait for async finish handler
      await new Promise((resolve) => setTimeout(resolve, 100));

      // After: COMPLETED (keygen is final API for sign_up)
      expect(await getSessionState(sessionId)).toBe("COMPLETED");
    });

    it("should change session to COMPLETED when calling final API (signin for sign_in)", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "sign_in",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_in",
        "signin",
      );

      // Before: COMMITTED
      expect(await getSessionState(sessionId)).toBe("COMMITTED");

      await request(app)
        .post("/test/signin")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(200);

      // Wait for async finish handler
      await new Promise((resolve) => setTimeout(resolve, 100));

      // After: COMPLETED (signin is final API for sign_in)
      expect(await getSessionState(sessionId)).toBe("COMPLETED");
    });

    it("should not update session to COMPLETED on API failure", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_up",
        "keygen",
      );

      // Before: COMMITTED
      expect(await getSessionState(sessionId)).toBe("COMMITTED");

      await request(app)
        .post("/test/keygen_fail")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(500);

      // Wait for async finish handler
      await new Promise((resolve) => setTimeout(resolve, 100));

      // After: still COMMITTED (API failed)
      expect(await getSessionState(sessionId)).toBe("COMMITTED");
    });
  });

  describe("route integration tests", () => {
    it("keygen route: should pass with sign_up operation", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_up",
        "keygen",
      );

      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("keygen ok");
    });

    it("keygen_ed25519 route: should pass with add_ed25519 operation", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "add_ed25519",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "add_ed25519",
        "keygen_ed25519",
      );

      const response = await request(app)
        .post("/test/keygen_ed25519")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("keygen_ed25519 ok");
    });

    it("signin route: should pass with sign_in operation", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "sign_in",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_in",
        "signin",
      );

      const response = await request(app)
        .post("/test/signin")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("signin ok");
    });

    it("reshare route: should pass with reshare operation", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "reshare",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "reshare",
        "reshare",
      );

      const response = await request(app)
        .post("/test/reshare")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("reshare ok");
    });

    it("add_ed25519_with_reshare: should allow signin, keygen_ed25519, reshare in sequence", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "add_ed25519_with_reshare",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      // 1. signin (not final)
      const signinSignature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "add_ed25519_with_reshare",
        "signin",
      );

      const signinResponse = await request(app)
        .post("/test/signin")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signinSignature,
          auth_type: authType,
        })
        .expect(200);

      expect(signinResponse.body.success).toBe(true);

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Session should still be COMMITTED
      expect(await getSessionState(sessionId)).toBe("COMMITTED");

      // 2. keygen_ed25519 (not final)
      const keygenSignature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "add_ed25519_with_reshare",
        "keygen_ed25519",
      );

      const keygenResponse = await request(app)
        .post("/test/keygen_ed25519")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: keygenSignature,
          auth_type: authType,
        })
        .expect(200);

      expect(keygenResponse.body.success).toBe(true);

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Session should still be COMMITTED
      expect(await getSessionState(sessionId)).toBe("COMMITTED");

      // 3. reshare (final API for add_ed25519_with_reshare)
      const reshareSignature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "add_ed25519_with_reshare",
        "reshare",
      );

      const reshareResponse = await request(app)
        .post("/test/reshare")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: reshareSignature,
          auth_type: authType,
        })
        .expect(200);

      expect(reshareResponse.body.success).toBe(true);

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Session should now be COMPLETED (reshare is final for add_ed25519_with_reshare)
      expect(await getSessionState(sessionId)).toBe("COMPLETED");
    });

    it("add_ed25519_with_reshare: should reject keygen (not allowed)", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      await createSession({
        session_id: sessionId,
        operation_type: "add_ed25519_with_reshare",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: hashRes.data.toHex(),
      });

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "add_ed25519_with_reshare",
        "keygen",
      );

      const response = await request(app)
        .post("/test/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("keygen");
      expect(response.body.msg).toContain("add_ed25519_with_reshare");
    });
  });
});
