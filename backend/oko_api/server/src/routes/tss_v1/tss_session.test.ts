import { jest } from "@jest/globals";
import { insertKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";
import { createUser } from "@oko-wallet/oko-pg-interface/oko_users";
import { createWallet } from "@oko-wallet/oko-pg-interface/oko_wallets";
import type { WalletStatus } from "@oko-wallet/oko-types/wallets";
import { createPgConn } from "@oko-wallet/postgres-lib";
import type { Pool } from "pg";
import request from "supertest";

import { generateUserToken } from "@oko-wallet-api/api/tss/keplr_auth";
import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";

const mockAbortTssSession = jest.fn();

await jest.unstable_mockModule("@oko-wallet-api/api/tss/tss_session", () => ({
  abortTssSession: mockAbortTssSession,
}));

// Dynamically import after jest.unstable_mockModule to apply ESM mocks correctly
const { makeApp } = await import("@oko-wallet-api/testing/app");
const { abortTssSession } = await import("@oko-wallet-api/api/tss/tss_session");

const SSS_THRESHOLD = 2;

describe("tss_session_route_test", () => {
  let app: any;
  let pool: Pool;
  let validToken: string;
  let testUser: any;
  let testWallet: any;

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

    app = makeApp({
      JWT_SECRET: "test-jwt-secret",
      JWT_EXPIRES_IN: "1h",
      ENCRYPTION_SECRET: "test-encryption-secret",
    });
    app.locals.db = pool;
  });

  beforeEach(async () => {
    await resetPgDatabase(pool);
    jest.clearAllMocks();

    await insertKeyShareNodeMeta(pool, {
      sss_threshold: SSS_THRESHOLD,
      registration_threshold: null,
    });

    const createUserRes = await createUser(pool, "test@example.com", "google");
    if (createUserRes.success === false) {
      throw new Error(`Failed to create user: ${createUserRes.err}`);
    }
    testUser = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: testUser.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(`test_public_key_${Date.now()}`, "hex"),
      enc_tss_share: Buffer.from(`test_enc_share_${Date.now()}`, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      throw new Error(`Failed to create wallet: ${createWalletRes.err}`);
    }
    testWallet = createWalletRes.data;

    const tokenResult = generateUserToken({
      wallet_id: testWallet.wallet_id,
      email: testUser.email,
      jwt_config: {
        secret: "test-jwt-secret",
        expires_in: "1h",
      },
    });
    if (tokenResult.success === false) {
      throw new Error(`Failed to generate token: ${tokenResult.err}`);
    }
    validToken = tokenResult.data.token;
  });

  describe("/session/abort", () => {
    const endpoint = "/tss/v1/session/abort";
    const validBody = {
      session_id: "110e8400-e29b-41d4-a716-446655440001",
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(validBody);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(abortTssSession).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(validBody);

      expect(response.status).toBe(401);
      expect(abortTssSession).not.toHaveBeenCalled();
    });

    it("should return 400 when session_id is missing from body", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toBe("Session id is required");
      expect(abortTssSession).not.toHaveBeenCalled();
    });

    it("should return 400 when session_id is empty string", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ session_id: "" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toBe("Session id is required");
      expect(abortTssSession).not.toHaveBeenCalled();
    });

    it("should return 400 when session_id is null", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ session_id: null });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toBe("Session id is required");
      expect(abortTssSession).not.toHaveBeenCalled();
    });

    it("should return 200 and call abortTssSession when valid request is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          session_id: validBody.session_id,
        },
      };
      mockAbortTssSession.mockReturnValue(Promise.resolve(mockApiResponse));

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send(validBody);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.session_id).toBe(validBody.session_id);
      expect(abortTssSession).toHaveBeenCalledWith(pool, {
        email: testUser.email,
        wallet_id: testWallet.wallet_id,
        session_id: validBody.session_id,
      });
    });

    it("should return 500 when abortTssSession returns unknown error", async () => {
      const mockApiResponse = {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Database connection failed",
      };
      mockAbortTssSession.mockReturnValue(Promise.resolve(mockApiResponse));

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send(validBody);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("UNKNOWN_ERROR");
      expect(response.body.msg).toBe("Database connection failed");
      expect(abortTssSession).toHaveBeenCalledWith(pool, {
        email: testUser.email,
        wallet_id: testWallet.wallet_id,
        session_id: validBody.session_id,
      });
    });

    it("should return 400 when abortTssSession returns INVALID_REQUEST error", async () => {
      const mockApiResponse = {
        success: false,
        code: "INVALID_REQUEST",
        msg: "Invalid session state",
      };
      mockAbortTssSession.mockReturnValue(Promise.resolve(mockApiResponse));

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send(validBody);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_REQUEST");
      expect(response.body.msg).toBe("Invalid session state");
      expect(abortTssSession).toHaveBeenCalledWith(pool, {
        email: testUser.email,
        wallet_id: testWallet.wallet_id,
        session_id: validBody.session_id,
      });
    });

    it("should return 401 when abortTssSession returns UNAUTHORIZED error", async () => {
      const mockApiResponse = {
        success: false,
        code: "UNAUTHORIZED",
        msg: "User not authorized for this wallet",
      };
      mockAbortTssSession.mockReturnValue(Promise.resolve(mockApiResponse));

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send(validBody);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("UNAUTHORIZED");
      expect(response.body.msg).toBe("User not authorized for this wallet");
      expect(abortTssSession).toHaveBeenCalledWith(pool, {
        email: testUser.email,
        wallet_id: testWallet.wallet_id,
        session_id: validBody.session_id,
      });
    });

    it("should return 404 when abortTssSession returns TSS_SESSION_NOT_FOUND error", async () => {
      const mockApiResponse = {
        success: false,
        code: "TSS_SESSION_NOT_FOUND",
        msg: "TSS session not found",
      };
      mockAbortTssSession.mockReturnValue(Promise.resolve(mockApiResponse));

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send(validBody);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("TSS_SESSION_NOT_FOUND");
      expect(response.body.msg).toBe("TSS session not found");
      expect(abortTssSession).toHaveBeenCalledWith(pool, {
        email: testUser.email,
        wallet_id: testWallet.wallet_id,
        session_id: validBody.session_id,
      });
    });

    it("should return 400 when abortTssSession returns INVALID_TSS_SESSION error", async () => {
      const mockApiResponse = {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: "Session cannot be aborted",
      };
      mockAbortTssSession.mockReturnValue(Promise.resolve(mockApiResponse));

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send(validBody);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_TSS_SESSION");
      expect(response.body.msg).toBe("Session cannot be aborted");
      expect(abortTssSession).toHaveBeenCalledWith(pool, {
        email: testUser.email,
        wallet_id: testWallet.wallet_id,
        session_id: validBody.session_id,
      });
    });
  });
});
