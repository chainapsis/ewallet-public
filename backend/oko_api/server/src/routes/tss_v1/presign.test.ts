import { jest } from "@jest/globals";
import request from "supertest";
import type { Pool } from "pg";
import { createPgConn } from "@oko-wallet/postgres-lib";

import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";
import { generateUserToken } from "@oko-wallet-api/api/tss/keplr_auth";
import { TEMP_ENC_SECRET } from "@oko-wallet-api/api/tss/utils";

const mockRunPresignStep1 = jest.fn() as jest.Mock;
const mockRunPresignStep2 = jest.fn() as jest.Mock;
const mockRunPresignStep3 = jest.fn() as jest.Mock;

await jest.unstable_mockModule("@oko-wallet-api/api/tss/v1/presign", () => ({
  runPresignStep1: mockRunPresignStep1,
  runPresignStep2: mockRunPresignStep2,
  runPresignStep3: mockRunPresignStep3,
}));

await jest.unstable_mockModule(
  "@oko-wallet-api/middleware/auth/tss_activate",
  () => ({
    tssActivateMiddleware: (_req: any, _res: any, next: any) => next(),
  }),
);

// Dynamically import after jest.unstable_mockModule to apply ESM mocks correctly
const { makeApp } = await import("@oko-wallet-api/testing/app");
const { runPresignStep1, runPresignStep2, runPresignStep3 } = await import(
  "@oko-wallet-api/api/tss/v1/presign"
);

describe("presign_route_test", () => {
  let app: any;
  let pool: Pool;

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
      ENCRYPTION_SECRET: TEMP_ENC_SECRET,
    });
    app.locals.db = pool;
  });

  beforeEach(async () => {
    await resetPgDatabase(pool);
    jest.clearAllMocks();
  });

  describe("step_1", () => {
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";
    const endpoint = "/tss/v1/presign/step1";
    const body = {
      session_id: "session123",
      msgs_1: {
        wait_0: { "0": "msg0" },
        wait_1: { "0": ["msg1", "msg2"] },
      },
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runPresignStep1).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runPresignStep1).not.toHaveBeenCalled();
    });

    it("should return 200 and call runPresignStep1 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          msgs_0: {
            wait_0: { "1": "msg0_response" },
            wait_1: { "1": ["msg1_response", "msg2_response"] },
          },
        },
      };
      (mockRunPresignStep1 as any).mockResolvedValue(mockApiResponse);

      const genTokenRes = generateUserToken({
        email: testEmail,
        wallet_id: testWalletId,
        jwt_config: {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
      });

      if (!genTokenRes.success) {
        throw new Error(`Token generation failed: ${genTokenRes.err}`);
      }

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${genTokenRes.data.token}`)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockApiResponse.data,
      });
      expect(runPresignStep1).toHaveBeenCalledWith(
        pool,
        {
          email: testEmail,
          wallet_id: testWalletId,
          session_id: body.session_id,
          msgs_1: body.msgs_1,
        },
        TEMP_ENC_SECRET,
      );
    });

    it("should return error when runPresignStep1 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: "Invalid session",
      };
      (mockRunPresignStep1 as any).mockResolvedValue(mockApiError);

      const genTokenRes = generateUserToken({
        email: testEmail,
        wallet_id: testWalletId,
        jwt_config: {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
      });

      if (!genTokenRes.success) {
        throw new Error(`Token generation failed: ${genTokenRes.err}`);
      }

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${genTokenRes.data.token}`)
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        code: mockApiError.code,
        msg: mockApiError.msg,
      });
    });
  });

  describe("step_2", () => {
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";
    const endpoint = "/tss/v1/presign/step2";
    const body = {
      session_id: "session123",
      wait_1_0_1: ["msg1", "msg2"],
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runPresignStep2).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runPresignStep2).not.toHaveBeenCalled();
    });

    it("should return 200 and call runPresignStep2 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          wait_1_1_0: ["response_msg1", "response_msg2"],
        },
      };
      (mockRunPresignStep2 as any).mockResolvedValue(mockApiResponse);

      const genTokenRes = generateUserToken({
        email: testEmail,
        wallet_id: testWalletId,
        jwt_config: {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
      });

      if (!genTokenRes.success) {
        throw new Error(`Token generation failed: ${genTokenRes.err}`);
      }

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${genTokenRes.data.token}`)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockApiResponse.data,
      });
      expect(runPresignStep2).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        wait_1_0_1: body.wait_1_0_1,
      });
    });

    it("should return error when runPresignStep2 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: "Invalid stage",
      };
      (mockRunPresignStep2 as any).mockResolvedValue(mockApiError);

      const genTokenRes = generateUserToken({
        email: testEmail,
        wallet_id: testWalletId,
        jwt_config: {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
      });

      if (!genTokenRes.success) {
        throw new Error(`Token generation failed: ${genTokenRes.err}`);
      }

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${genTokenRes.data.token}`)
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        code: mockApiError.code,
        msg: mockApiError.msg,
      });
    });
  });

  describe("step_3", () => {
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";
    const endpoint = "/tss/v1/presign/step3";
    const body = {
      session_id: "session123",
      presign_big_r: "big_r_value",
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runPresignStep3).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runPresignStep3).not.toHaveBeenCalled();
    });

    it("should return 200 and call runPresignStep3 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          presign_big_r: "big_r_value",
        },
      };
      (mockRunPresignStep3 as any).mockResolvedValue(mockApiResponse);

      const genTokenRes = generateUserToken({
        email: testEmail,
        wallet_id: testWalletId,
        jwt_config: {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
      });

      if (!genTokenRes.success) {
        throw new Error(`Token generation failed: ${genTokenRes.err}`);
      }

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${genTokenRes.data.token}`)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockApiResponse.data,
      });
      expect(runPresignStep3).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        presign_big_r: body.presign_big_r,
      });
    });

    it("should return error when runPresignStep3 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_PRESIGN_RESULT",
        msg: "Invalid presign result",
      };
      (mockRunPresignStep3 as any).mockResolvedValue(mockApiError);

      const genTokenRes = generateUserToken({
        email: testEmail,
        wallet_id: testWalletId,
        jwt_config: {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
      });

      if (!genTokenRes.success) {
        throw new Error(`Token generation failed: ${genTokenRes.err}`);
      }

      const response = await request(app)
        .post(endpoint)
        .set("Authorization", `Bearer ${genTokenRes.data.token}`)
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        code: mockApiError.code,
        msg: mockApiError.msg,
      });
    });
  });
});
