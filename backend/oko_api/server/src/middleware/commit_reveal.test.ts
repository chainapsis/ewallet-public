import request from "supertest";
import express from "express";
import type { Pool } from "pg";
import { Bytes } from "@oko-wallet/bytes";
import { randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { createPgConn } from "@oko-wallet/postgres-lib";
import winston from "winston";

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

describe("commit_reveal_middleware_basic_validation_test", () => {
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
    app.post(
      "/test/keygen",
      commitRevealMiddleware("keygen"),
      (_req, res) => {
        res.status(200).json({ success: true, data: { message: "keygen ok" } });
      },
    );
    app.post(
      "/test/signin",
      commitRevealMiddleware("signin"),
      (_req, res) => {
        res.status(200).json({ success: true, data: { message: "signin ok" } });
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
      `INSERT INTO "commit_reveal_sessions"
       (session_id, operation_type, client_ephemeral_pubkey, id_token_hash, state, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
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
});
