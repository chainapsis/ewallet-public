import request from "supertest";
import express from "express";
import { Pool } from "pg";
import dayjs from "dayjs";
import { Bytes } from "@oko-wallet/bytes";
import { randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";

import { connectPG, resetPgDatabase } from "@oko-wallet-ksn-server/database";
import { testPgConfig } from "@oko-wallet-ksn-server/database/test_config";
import type { ServerState } from "@oko-wallet-ksn-server/state";
import { commit } from "./commit";

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

function generateRandomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

describe("commit_reveal_commit_test", () => {
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

    app = express();
    app.use(express.json());

    app.post("/keyshare/v2/commit", commit);

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
  });

  beforeEach(async () => {
    await resetPgDatabase(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  const testEndpoint = "/keyshare/v2/commit";

  const createValidBody = () => ({
    session_id: uuidv4(),
    operation_type: "sign_in",
    client_ephemeral_pubkey: generateRandomHex(32),
    id_token_hash: generateRandomHex(32),
  });

  describe("success cases", () => {
    it("should successfully create session with sign_in operation", async () => {
      const body = createValidBody();

      const response = await request(app)
        .post(testEndpoint)
        .send(body)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.node_pubkey).toBe(
        mockServerKeypair.publicKey.toHex(),
      );
      expect(response.body.data.node_signature).toBeDefined();
      expect(response.body.data.node_signature).toHaveLength(128); // 64 bytes hex
    });

    it("should successfully create session with sign_up operation", async () => {
      const body = {
        ...createValidBody(),
        operation_type: "sign_up",
      };

      const response = await request(app)
        .post(testEndpoint)
        .send(body)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.node_pubkey).toBeDefined();
      expect(response.body.data.node_signature).toBeDefined();
    });

    it("should successfully create session with sign_in_reshare operation", async () => {
      const body = {
        ...createValidBody(),
        operation_type: "sign_in_reshare",
      };

      const response = await request(app)
        .post(testEndpoint)
        .send(body)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it("should successfully create session with register_reshare operation", async () => {
      const body = {
        ...createValidBody(),
        operation_type: "register_reshare",
      };

      const response = await request(app)
        .post(testEndpoint)
        .send(body)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it("should successfully create session with add_ed25519 operation", async () => {
      const body = {
        ...createValidBody(),
        operation_type: "add_ed25519",
      };

      const response = await request(app)
        .post(testEndpoint)
        .send(body)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it("should create multiple sessions with different session_ids", async () => {
      const body1 = createValidBody();
      const body2 = createValidBody();
      const body3 = createValidBody();

      const response1 = await request(app)
        .post(testEndpoint)
        .send(body1)
        .expect(200);
      const response2 = await request(app)
        .post(testEndpoint)
        .send(body2)
        .expect(200);
      const response3 = await request(app)
        .post(testEndpoint)
        .send(body3)
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
      expect(response3.body.success).toBe(true);
    });
  });

  describe("duplicate key errors", () => {
    it("should return 409 when session_id already exists", async () => {
      const sessionId = uuidv4();
      const body1 = {
        ...createValidBody(),
        session_id: sessionId,
      };
      const body2 = {
        ...createValidBody(),
        session_id: sessionId,
      };

      await request(app).post(testEndpoint).send(body1).expect(200);

      const response = await request(app)
        .post(testEndpoint)
        .send(body2)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("SESSION_ALREADY_EXISTS");
    });

    it("should return 409 when client_ephemeral_pubkey already exists", async () => {
      const pubkey = generateRandomHex(32);
      const body1 = {
        ...createValidBody(),
        client_ephemeral_pubkey: pubkey,
      };
      const body2 = {
        ...createValidBody(),
        client_ephemeral_pubkey: pubkey,
      };

      await request(app).post(testEndpoint).send(body1).expect(200);

      const response = await request(app)
        .post(testEndpoint)
        .send(body2)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("SESSION_ALREADY_EXISTS");
    });

    it("should return 409 when id_token_hash already exists", async () => {
      const idTokenHash = generateRandomHex(32);
      const body1 = {
        ...createValidBody(),
        id_token_hash: idTokenHash,
      };
      const body2 = {
        ...createValidBody(),
        id_token_hash: idTokenHash,
      };

      await request(app).post(testEndpoint).send(body1).expect(200);

      const response = await request(app)
        .post(testEndpoint)
        .send(body2)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("SESSION_ALREADY_EXISTS");
    });
  });

  describe("invalid input errors", () => {
    it("should return 400 when client_ephemeral_pubkey is invalid hex", async () => {
      const body = {
        ...createValidBody(),
        client_ephemeral_pubkey: "invalid_hex_string",
      };

      const response = await request(app)
        .post(testEndpoint)
        .send(body)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("client_ephemeral_pubkey");
    });

    it("should return 400 when client_ephemeral_pubkey is wrong length", async () => {
      const body = {
        ...createValidBody(),
        client_ephemeral_pubkey: generateRandomHex(16), // 16 bytes instead of 32
      };

      const response = await request(app)
        .post(testEndpoint)
        .send(body)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("client_ephemeral_pubkey");
    });

    it("should return 400 when id_token_hash is invalid hex", async () => {
      const body = {
        ...createValidBody(),
        id_token_hash: "invalid_hex_string",
      };

      const response = await request(app)
        .post(testEndpoint)
        .send(body)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("id_token_hash");
    });

    it("should return 400 when id_token_hash is wrong length", async () => {
      const body = {
        ...createValidBody(),
        id_token_hash: generateRandomHex(16), // 16 bytes instead of 32
      };

      const response = await request(app)
        .post(testEndpoint)
        .send(body)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("id_token_hash");
    });

    it("should return 500 when session_id is missing (DB error)", async () => {
      const body = createValidBody();
      const { session_id, ...bodyWithoutSessionId } = body;

      const response = await request(app)
        .post(testEndpoint)
        .send(bodyWithoutSessionId)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it("should return 500 when operation_type is missing (DB error)", async () => {
      const body = createValidBody();
      const { operation_type, ...bodyWithoutOperationType } = body;

      const response = await request(app)
        .post(testEndpoint)
        .send(bodyWithoutOperationType)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it("should return 400 when client_ephemeral_pubkey is missing", async () => {
      const body = createValidBody();
      const { client_ephemeral_pubkey, ...bodyWithoutPubkey } = body;

      const response = await request(app)
        .post(testEndpoint)
        .send(bodyWithoutPubkey)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should return 400 when id_token_hash is missing", async () => {
      const body = createValidBody();
      const { id_token_hash, ...bodyWithoutHash } = body;

      const response = await request(app)
        .post(testEndpoint)
        .send(bodyWithoutHash)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("session verification", () => {
    it("should create session in COMMITTED state", async () => {
      const body = createValidBody();

      await request(app).post(testEndpoint).send(body).expect(200);

      // Verify session was created in DB
      const result = await pool.query(
        'SELECT * FROM "2_commit_reveal_sessions" WHERE session_id = $1',
        [body.session_id],
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].state).toBe("COMMITTED");
      expect(result.rows[0].operation_type).toBe(body.operation_type);
      expect(result.rows[0].id_token_hash).toBe(body.id_token_hash);
    });

    it("should set expires_at to approximately 5 minutes from now", async () => {
      const body = createValidBody();
      const beforeRequest = new Date();

      await request(app).post(testEndpoint).send(body).expect(200);

      const afterRequest = new Date();

      const result = await pool.query(
        'SELECT * FROM "2_commit_reveal_sessions" WHERE session_id = $1',
        [body.session_id],
      );

      expect(result.rows.length).toBe(1);

      const expiresAt = new Date(result.rows[0].expires_at);
      const expectedMinExpiresAt = new Date(
        beforeRequest.getTime() + 5 * 60 * 1000 - 1000,
      );
      const expectedMaxExpiresAt = new Date(
        afterRequest.getTime() + 5 * 60 * 1000 + 1000,
      );

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
        expectedMinExpiresAt.getTime(),
      );
      expect(expiresAt.getTime()).toBeLessThanOrEqual(
        expectedMaxExpiresAt.getTime(),
      );
    });
  });
});
