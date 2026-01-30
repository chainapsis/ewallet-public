import { jest } from "@jest/globals";
import request from "supertest";
import type { Pool } from "pg";
import { createPgConn } from "@oko-wallet/postgres-lib";

import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";
import { generateUserToken } from "@oko-wallet-api/api/tss/keplr_auth";
import { TEMP_ENC_SECRET } from "@oko-wallet-api/api/tss/utils";

const mockRunSignStep1 = jest.fn() as jest.Mock;
const mockRunSignStep2 = jest.fn() as jest.Mock;

await jest.unstable_mockModule("@oko-wallet-api/api/tss/v1/sign", () => ({
  runSignStep1: mockRunSignStep1,
  runSignStep2: mockRunSignStep2,
}));

await jest.unstable_mockModule(
  "@oko-wallet-api/middleware/auth/tss_activate",
  () => ({
    tssActivateMiddleware: (_req: any, _res: any, next: any) => next(),
  }),
);

// Dynamically import after jest.unstable_mockModule to apply ESM mocks correctly
const { makeApp } = await import("@oko-wallet-api/testing/app");
const { runSignStep1, runSignStep2 } = await import(
  "@oko-wallet-api/api/tss/v1/sign"
);

describe("sign_route_test", () => {
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
    const endpoint = "/tss/v1/sign/step1";
    const body = {
      session_id: "session123",
      msg: [1, 2, 3],
      msgs_1: {
        wait_0: { "0": "msg0" },
      },
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runSignStep1).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runSignStep1).not.toHaveBeenCalled();
    });

    it("should return 200 and call runSignStep1 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          msgs_0: {
            wait_0: { "1": "msg0_response" },
          },
        },
      };
      (mockRunSignStep1 as any).mockResolvedValue(mockApiResponse);

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
      expect(runSignStep1).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        msg: body.msg,
        msgs_1: body.msgs_1,
      });
    });

    it("should return error when runSignStep1 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: "Invalid session",
      };
      (mockRunSignStep1 as any).mockResolvedValue(mockApiError);

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
    const endpoint = "/tss/v1/sign/step2";
    const body = {
      session_id: "session123",
      sign_output: {
        signature: "sig123",
        recid: 1,
      },
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runSignStep2).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runSignStep2).not.toHaveBeenCalled();
    });

    it("should return 200 and call runSignStep2 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          completed: true,
        },
      };
      (mockRunSignStep2 as any).mockResolvedValue(mockApiResponse);

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
      expect(runSignStep2).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        sign_output: body.sign_output,
      });
    });

    it("should return error when runSignStep2 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_SIGN_RESULT",
        msg: "Invalid sign result",
      };
      (mockRunSignStep2 as any).mockResolvedValue(mockApiError);

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
