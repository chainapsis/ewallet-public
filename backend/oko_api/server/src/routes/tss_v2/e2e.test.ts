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
import { commitRevealCommit } from "./commit";
import { commitRevealMiddleware } from "@oko-wallet-api/middleware/commit_reveal";

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

describe("tss_v2_commit_reveal_e2e_test", () => {
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

    // Commit endpoint (no middleware)
    app.post("/tss/v2/commit", commitRevealCommit);

    // Protected endpoints with commit-reveal middleware
    // Mock handlers that simulate successful API calls
    app.post(
      "/tss/v2/keygen",
      commitRevealMiddleware("keygen"),
      (_req, res) => {
        res.status(200).json({
          success: true,
          data: { wallet_id: uuidv4(), public_key: generateRandomHex(33) },
        });
      },
    );

    app.post(
      "/tss/v2/keygen_ed25519",
      commitRevealMiddleware("keygen_ed25519"),
      (_req, res) => {
        res.status(200).json({
          success: true,
          data: { wallet_id: uuidv4(), public_key: generateRandomHex(32) },
        });
      },
    );

    app.post(
      "/tss/v2/user/signin",
      commitRevealMiddleware("signin"),
      (_req, res) => {
        res.status(200).json({
          success: true,
          data: { token: "mock_jwt_token", user_id: uuidv4() },
        });
      },
    );

    app.post(
      "/tss/v2/user/reshare",
      commitRevealMiddleware("reshare"),
      (_req, res) => {
        res.status(200).json({
          success: true,
          data: { reshare_complete: true },
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

  describe("sign_up flow (commit -> keygen)", () => {
    it("should complete full sign_up flow: commit -> keygen -> verify data", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token_for_signup";

      // Generate client keypair
      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      // Compute id_token_hash
      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }
      const idTokenHash = hashRes.data.toHex();

      // Step 1: Commit
      const commitResponse = await request(app)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        })
        .expect(200);

      expect(commitResponse.body.success).toBe(true);
      expect(commitResponse.body.data.node_pubkey).toBe(
        mockServerKeypair.publicKey.toHex(),
      );
      expect(commitResponse.body.data.node_signature).toHaveLength(128);

      // Verify session is in COMMITTED state
      expect(await getSessionState(sessionId)).toBe("COMMITTED");

      // Step 2: Keygen with commit-reveal signature
      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_up",
        "keygen",
      );

      const keygenResponse = await request(app)
        .post("/tss/v2/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
                  })
        .expect(200);

      expect(keygenResponse.body.success).toBe(true);
      expect(keygenResponse.body.data.wallet_id).toBeDefined();
      expect(keygenResponse.body.data.public_key).toBeDefined();

      // Wait for async finish handler
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify session is now COMPLETED
      expect(await getSessionState(sessionId)).toBe("COMPLETED");

      // Verify API call was recorded
      expect(await getApiCallCount(sessionId, "keygen")).toBe(1);
    });

    it("should reject replay attack on keygen API", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token_replay";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      // Commit
      await request(app)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: hashRes.data.toHex(),
        })
        .expect(200);

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_up",
        "keygen",
      );

      // First keygen call - success
      await request(app)
        .post("/tss/v2/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
                  })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reset session state to COMMITTED to allow second attempt
      await pool.query(
        `UPDATE "commit_reveal_sessions" SET state = 'COMMITTED' WHERE session_id = $1`,
        [sessionId],
      );

      // Second keygen call - should be rejected (replay attack)
      const replayResponse = await request(app)
        .post("/tss/v2/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(409);

      expect(replayResponse.body.success).toBe(false);
      expect(replayResponse.body.code).toBe("API_ALREADY_CALLED");
    });
  });

  describe("sign_in flow (commit -> signin)", () => {
    it("should complete full sign_in flow", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token_for_signin";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      // Commit
      const commitResponse = await request(app)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_in",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: hashRes.data.toHex(),
        })
        .expect(200);

      expect(commitResponse.body.success).toBe(true);

      // Signin
      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_in",
        "signin",
      );

      const signinResponse = await request(app)
        .post("/tss/v2/user/signin")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
                  })
        .expect(200);

      expect(signinResponse.body.success).toBe(true);
      expect(signinResponse.body.data.token).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Session should be COMPLETED (signin is the final API for sign_in operation)
      expect(await getSessionState(sessionId)).toBe("COMPLETED");
    });
  });

  describe("reshare flow (commit -> signin -> reshare)", () => {
    it("should complete full reshare flow", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token_for_reshare";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      // Commit with reshare operation
      await request(app)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "reshare",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: hashRes.data.toHex(),
        })
        .expect(200);

      // Step 1: Signin (not final for reshare operation)
      const signinSignature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "reshare",
        "signin",
      );

      await request(app)
        .post("/tss/v2/user/signin")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signinSignature,
          auth_type: authType,
        })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Session should still be COMMITTED (signin is not final for reshare operation)
      expect(await getSessionState(sessionId)).toBe("COMMITTED");

      // Step 2: Reshare (final API) - V2 schema requires both wallets
      const reshareSignature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "reshare",
        "reshare",
      );

      const reshareResponse = await request(app)
        .post("/tss/v2/user/reshare")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: reshareSignature,
          auth_type: authType,
                    // V2 schema: both secp256k1 and ed25519 public keys required
          secp256k1_public_key: "02" + "a".repeat(64),
          ed25519_public_key: "b".repeat(64),
          reshared_key_shares: [
            { name: "node1", endpoint: "http://localhost:3001" },
            { name: "node2", endpoint: "http://localhost:3002" },
          ],
        })
        .expect(200);

      expect(reshareResponse.body.success).toBe(true);
      expect(reshareResponse.body.data.reshare_complete).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Session should now be COMPLETED
      expect(await getSessionState(sessionId)).toBe("COMPLETED");

      // Both API calls should be recorded
      expect(await getApiCallCount(sessionId, "signin")).toBe(1);
      expect(await getApiCallCount(sessionId, "reshare")).toBe(1);
    });
  });

  describe("add_ed25519 flow (commit -> keygen_ed25519)", () => {
    it("should complete full add_ed25519 flow", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token_for_ed25519";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      // Commit
      await request(app)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "add_ed25519",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: hashRes.data.toHex(),
        })
        .expect(200);

      // Keygen ed25519
      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "add_ed25519",
        "keygen_ed25519",
      );

      const keygenResponse = await request(app)
        .post("/tss/v2/keygen_ed25519")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
                  })
        .expect(200);

      expect(keygenResponse.body.success).toBe(true);
      expect(keygenResponse.body.data.wallet_id).toBeDefined();
      expect(keygenResponse.body.data.public_key).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Session should be COMPLETED
      expect(await getSessionState(sessionId)).toBe("COMPLETED");
      expect(await getApiCallCount(sessionId, "keygen_ed25519")).toBe(1);
    });
  });

  describe("add_ed25519_with_reshare flow (commit -> signin -> keygen_ed25519 -> reshare)", () => {
    it("should complete full add_ed25519_with_reshare flow", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token_for_reshare_ed25519";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      // Commit with add_ed25519_with_reshare operation
      await request(app)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "add_ed25519_with_reshare",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: hashRes.data.toHex(),
        })
        .expect(200);

      // Step 1: Signin
      const signinSignature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "add_ed25519_with_reshare",
        "signin",
      );

      await request(app)
        .post("/tss/v2/user/signin")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signinSignature,
          auth_type: authType,
        })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Session should still be COMMITTED
      expect(await getSessionState(sessionId)).toBe("COMMITTED");

      // Step 2: Keygen ed25519
      const keygenEd25519Signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "add_ed25519_with_reshare",
        "keygen_ed25519",
      );

      const keygenResponse = await request(app)
        .post("/tss/v2/keygen_ed25519")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: keygenEd25519Signature,
          auth_type: authType,
        })
        .expect(200);

      expect(keygenResponse.body.success).toBe(true);
      expect(keygenResponse.body.data.wallet_id).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Session should still be COMMITTED
      expect(await getSessionState(sessionId)).toBe("COMMITTED");

      // Step 3: Reshare (final) - V2 schema requires both wallets
      const reshareSignature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "add_ed25519_with_reshare",
        "reshare",
      );

      await request(app)
        .post("/tss/v2/user/reshare")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: reshareSignature,
          auth_type: authType,
          // V2 schema: both secp256k1 and ed25519 public keys required
          secp256k1_public_key: "02" + "a".repeat(64),
          ed25519_public_key: "b".repeat(64),
          reshared_key_shares: [
            { name: "node1", endpoint: "http://localhost:3001" },
            { name: "node2", endpoint: "http://localhost:3002" },
          ],
        })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Session should now be COMPLETED (reshare is final for add_ed25519_with_reshare)
      expect(await getSessionState(sessionId)).toBe("COMPLETED");

      // All three API calls should be recorded
      expect(await getApiCallCount(sessionId, "signin")).toBe(1);
      expect(await getApiCallCount(sessionId, "keygen_ed25519")).toBe(1);
      expect(await getApiCallCount(sessionId, "reshare")).toBe(1);
    });

    it("should reject keygen (not keygen_ed25519) for add_ed25519_with_reshare", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token_reject_keygen";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      const hashRes = sha256(`${authType}${idToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      // Commit with add_ed25519_with_reshare operation
      await request(app)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "add_ed25519_with_reshare",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: hashRes.data.toHex(),
        })
        .expect(200);

      // Try to call keygen (not allowed for add_ed25519_with_reshare)
      const keygenSignature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "add_ed25519_with_reshare",
        "keygen",
      );

      const response = await request(app)
        .post("/tss/v2/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: keygenSignature,
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

describe("tss_v2_e2e_error_scenarios", () => {
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

    app.post("/tss/v2/commit", commitRevealCommit);

    app.post(
      "/tss/v2/keygen",
      commitRevealMiddleware("keygen"),
      (_req, res) => {
        res.status(200).json({ success: true, data: { message: "keygen ok" } });
      },
    );

    app.post(
      "/tss/v2/user/signin",
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

  describe("error scenarios", () => {
    it("should reject invalid signature", async () => {
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

      // Commit
      await request(app)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: hashRes.data.toHex(),
        })
        .expect(200);

      // Try keygen with wrong signature (signed with wrong message)
      const wrongSignature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_up",
        "wrong_api", // wrong api name in signature
      );

      const response = await request(app)
        .post("/tss/v2/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: wrongSignature,
          auth_type: authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_SIGNATURE");
    });

    it("should reject expired session", async () => {
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

      // Commit
      await request(app)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: hashRes.data.toHex(),
        })
        .expect(200);

      // Manually expire the session
      await pool.query(
        `UPDATE "commit_reveal_sessions" SET expires_at = $1 WHERE session_id = $2`,
        [new Date(Date.now() - 1000), sessionId],
      );

      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_up",
        "keygen",
      );

      const response = await request(app)
        .post("/tss/v2/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(410);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("SESSION_EXPIRED");
    });

    it("should reject non-existent session", async () => {
      const nonExistentSessionId = uuidv4();
      const authType = "google";
      const idToken = "test_id_token";

      const response = await request(app)
        .post("/tss/v2/keygen")
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          cr_session_id: nonExistentSessionId,
          cr_signature: generateRandomHex(64),
          auth_type: authType,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("SESSION_NOT_FOUND");
    });

    it("should reject wrong operation type for API", async () => {
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

      // Commit with sign_in operation
      await request(app)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_in", // sign_in operation
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: hashRes.data.toHex(),
        })
        .expect(200);

      // Try to call keygen (not allowed for sign_in)
      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        idToken,
        "sign_in",
        "keygen",
      );

      const response = await request(app)
        .post("/tss/v2/keygen")
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
      expect(response.body.msg).toContain("sign_in");
    });

    it("should reject id_token_hash mismatch", async () => {
      const sessionId = uuidv4();
      const authType = "google";
      const originalIdToken = "original_id_token";
      const wrongIdToken = "wrong_id_token";

      const clientKeypairRes = generateEddsaKeypair();
      if (!clientKeypairRes.success) {
        throw new Error("Failed to generate keypair");
      }
      const clientKeypair = clientKeypairRes.data;

      // Hash with original token
      const hashRes = sha256(`${authType}${originalIdToken}`);
      if (!hashRes.success) {
        throw new Error("Failed to compute hash");
      }

      // Commit with original token hash
      await request(app)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: hashRes.data.toHex(),
        })
        .expect(200);

      // Try keygen with wrong id_token (different from committed hash)
      const signature = createValidSignature(
        clientKeypair,
        sessionId,
        authType,
        wrongIdToken, // wrong token
        "sign_up",
        "keygen",
      );

      const response = await request(app)
        .post("/tss/v2/keygen")
        .set("Authorization", `Bearer ${wrongIdToken}`) // wrong token in header
        .send({
          cr_session_id: sessionId,
          cr_signature: signature,
          auth_type: authType,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toContain("id_token_hash mismatch");
    });
  });
});
