import { jest } from "@jest/globals";
import request from "supertest";
import type { Pool } from "pg";
import { createPgConn } from "@oko-wallet/postgres-lib";
import {
  insertAPIKey,
  updateAPIKeyStatusByHashedKey,
} from "@oko-wallet/oko-pg-interface/api_keys";

import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";
import { generateUserToken } from "@oko-wallet-api/api/tss/keplr_auth";
import { TEMP_ENC_SECRET } from "@oko-wallet-api/api/tss/utils";

const mockFns = {
  runTriplesStep1: jest.fn(),
  runTriplesStep2: jest.fn(),
  runTriplesStep3: jest.fn(),
  runTriplesStep4: jest.fn(),
  runTriplesStep5: jest.fn(),
  runTriplesStep6: jest.fn(),
  runTriplesStep7: jest.fn(),
  runTriplesStep8: jest.fn(),
  runTriplesStep9: jest.fn(),
  runTriplesStep10: jest.fn(),
  runTriplesStep11: jest.fn(),
} as const;

await jest.unstable_mockModule("@oko-wallet-api/api/tss/v1/triples", () => ({
  ...mockFns,
}));

await jest.unstable_mockModule(
  "@oko-wallet-api/middleware/auth/tss_activate",
  () => ({
    tssActivateMiddleware: (_req: any, _res: any, next: any) => next(),
  }),
);

// Dynamically import after jest.unstable_mockModule to apply ESM mocks correctly
const { makeApp } = await import("@oko-wallet-api/testing/app");
const {
  runTriplesStep1,
  runTriplesStep2,
  runTriplesStep3,
  runTriplesStep4,
  runTriplesStep5,
  runTriplesStep6,
  runTriplesStep7,
  runTriplesStep8,
  runTriplesStep9,
  runTriplesStep10,
  runTriplesStep11,
} = await import("@oko-wallet-api/api/tss/v1/triples");

describe("triples_route_test", () => {
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
    const testApiKey = "test-api-key";
    const endpoint = "/tss/v1/triples/step1";
    const body = {
      msgs_1: ["msg1", "msg2"],
    };

    it("should return 401 when no x-api-key header is provided", async () => {
      await insertAPIKey(
        pool,
        "afb0afd1-d66d-4531-981c-cbf3fb1507b9",
        testApiKey,
      );

      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("API key is required");
      expect(runTriplesStep1).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid x-api-key header is provided", async () => {
      await insertAPIKey(
        pool,
        "afb0afd1-d66d-4531-981c-cbf3fb1507b9",
        testApiKey,
      );

      const response = await request(app)
        .post(endpoint)
        .set("x-api-key", "invalid-api-key")
        .send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid API key");
      expect(runTriplesStep1).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid x-api-key header is provided", async () => {
      await insertAPIKey(
        pool,
        "afb0afd1-d66d-4531-981c-cbf3fb1507b9",
        testApiKey,
      );

      await updateAPIKeyStatusByHashedKey(pool, testApiKey, false);

      const response = await request(app)
        .post(endpoint)
        .set("x-api-key", testApiKey)
        .send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("API key is not active");
      expect(runTriplesStep1).not.toHaveBeenCalled();
    });

    it("should return 401 when no authorization header is provided", async () => {
      await insertAPIKey(
        pool,
        "afb0afd1-d66d-4531-981c-cbf3fb1507b9",
        testApiKey,
      );

      const response = await request(app)
        .post(endpoint)
        .set("x-api-key", testApiKey)
        .send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runTriplesStep1).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      await insertAPIKey(
        pool,
        "afb0afd1-d66d-4531-981c-cbf3fb1507b9",
        testApiKey,
      );

      const response = await request(app)
        .post(endpoint)
        .set("x-api-key", testApiKey)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runTriplesStep1).not.toHaveBeenCalled();
    });

    it("should return 200 and call runTriplesStep1 when valid token is provided", async () => {
      await insertAPIKey(
        pool,
        "afb0afd1-d66d-4531-981c-cbf3fb1507b9",
        testApiKey,
      );

      const mockApiResponse = {
        success: true,
        data: {
          session_id: "test-session-id",
          msgs_0: ["msgs_0_1", "msgs_0_2"],
        },
      };
      (runTriplesStep1 as any).mockResolvedValue(mockApiResponse);

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
        .set("x-api-key", testApiKey)
        .set("Authorization", `Bearer ${genTokenRes.data.token}`)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockApiResponse.data,
      });
      expect(runTriplesStep1).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        customer_id: "afb0afd1-d66d-4531-981c-cbf3fb1507b9",
        msgs_1: body.msgs_1,
      });
    });

    it("should return error when runTriplesStep1 fails", async () => {
      await insertAPIKey(
        pool,
        "afb0afd1-d66d-4531-981c-cbf3fb1507b9",
        testApiKey,
      );

      const mockApiError = {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: "Invalid session",
      };
      (runTriplesStep1 as any).mockResolvedValue(mockApiError);

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
        .set("x-api-key", testApiKey)
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
    const endpoint = "/tss/v1/triples/step2";
    const body = {
      session_id: "test-session-id",
      wait_1: ["wait1", "wait2"],
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runTriplesStep2).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runTriplesStep2).not.toHaveBeenCalled();
    });

    it("should return 200 and call runTriplesStep2 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          wait_2: ["wait2_1", "wait2_2"],
        },
      };
      (runTriplesStep2 as any).mockResolvedValue(mockApiResponse);

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
      expect(runTriplesStep2).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        wait_1: body.wait_1,
      });
    });

    it("should return error when runTriplesStep2 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: "Invalid stage",
      };
      (runTriplesStep2 as any).mockResolvedValue(mockApiError);

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
    const endpoint = "/tss/v1/triples/step3";
    const body = {
      session_id: "test-session-id",
      wait_2: ["wait2_1", "wait2_2"],
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runTriplesStep3).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runTriplesStep3).not.toHaveBeenCalled();
    });

    it("should return 200 and call runTriplesStep3 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          wait_3: ["wait3_1", "wait3_2"],
        },
      };
      (runTriplesStep3 as any).mockResolvedValue(mockApiResponse);

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
      expect(runTriplesStep3).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        wait_2: body.wait_2,
      });
    });

    it("should return error when runTriplesStep3 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: "Invalid stage",
      };
      (runTriplesStep3 as any).mockResolvedValue(mockApiError);

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

  describe("step_4", () => {
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";
    const endpoint = "/tss/v1/triples/step4";
    const body = {
      session_id: "test-session-id",
      wait_3: ["wait3_1", "wait3_2"],
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runTriplesStep4).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runTriplesStep4).not.toHaveBeenCalled();
    });

    it("should return 200 and call runTriplesStep4 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          wait_4: ["wait4_1", "wait4_2"],
        },
      };
      (runTriplesStep4 as any).mockResolvedValue(mockApiResponse);

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
      expect(runTriplesStep4).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        wait_3: body.wait_3,
      });
    });

    it("should return error when runTriplesStep4 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: "Invalid stage",
      };
      (runTriplesStep4 as any).mockResolvedValue(mockApiError);

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

  describe("step_5", () => {
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";
    const endpoint = "/tss/v1/triples/step5";
    const body = {
      session_id: "test-session-id",
      wait_4: ["wait4_1", "wait4_2"],
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runTriplesStep5).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runTriplesStep5).not.toHaveBeenCalled();
    });

    it("should return 200 and call runTriplesStep5 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          batch_random_ot_wait_0: ["wait5_1", "wait5_2"],
        },
      };
      (runTriplesStep5 as any).mockResolvedValue(mockApiResponse);

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
      expect(runTriplesStep5).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        wait_4: body.wait_4,
      });
    });

    it("should return error when runTriplesStep5 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: "Invalid stage",
      };
      (runTriplesStep5 as any).mockResolvedValue(mockApiError);

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

  describe("step_6", () => {
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";
    const endpoint = "/tss/v1/triples/step6";
    const body = {
      session_id: "test-session-id",
      batch_random_ot_wait_0: ["wait6_1", "wait6_2"],
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runTriplesStep6).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runTriplesStep6).not.toHaveBeenCalled();
    });

    it("should return 200 and call runTriplesStep6 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          correlated_ot_wait_0: ["wait7_1", "wait7_2"],
        },
      };
      (runTriplesStep6 as any).mockResolvedValue(mockApiResponse);

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
      expect(runTriplesStep6).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        batch_random_ot_wait_0: body.batch_random_ot_wait_0,
      });
    });

    it("should return error when runTriplesStep6 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: "Invalid stage",
      };
      (runTriplesStep6 as any).mockResolvedValue(mockApiError);

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

  describe("step_7", () => {
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";
    const endpoint = "/tss/v1/triples/step7";
    const body = {
      session_id: "test-session-id",
      correlated_ot_wait_0: ["wait7_1", "wait7_2"],
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runTriplesStep7).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runTriplesStep7).not.toHaveBeenCalled();
    });

    it("should return 200 and call runTriplesStep7 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          random_ot_extension_wait_1: ["wait8_1", "wait8_2"],
        },
      };
      (runTriplesStep7 as any).mockResolvedValue(mockApiResponse);

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
      expect(runTriplesStep7).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        correlated_ot_wait_0: body.correlated_ot_wait_0,
      });
    });

    it("should return error when runTriplesStep7 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: "Invalid stage",
      };
      (runTriplesStep7 as any).mockResolvedValue(mockApiError);

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

  describe("step_8", () => {
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";
    const endpoint = "/tss/v1/triples/step8";
    const body = {
      session_id: "test-session-id",
      random_ot_extension_wait_1: ["wait8_1", "wait8_2"],
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runTriplesStep8).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runTriplesStep8).not.toHaveBeenCalled();
    });

    it("should return 200 and call runTriplesStep8 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          mta_wait_1: ["wait9_1", "wait9_2"],
        },
      };
      (runTriplesStep8 as any).mockResolvedValue(mockApiResponse);

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
      expect(runTriplesStep8).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        random_ot_extension_wait_1: body.random_ot_extension_wait_1,
      });
    });

    it("should return error when runTriplesStep8 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: "Invalid stage",
      };
      (runTriplesStep8 as any).mockResolvedValue(mockApiError);

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

  describe("step_9", () => {
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";
    const endpoint = "/tss/v1/triples/step9";
    const body = {
      session_id: "test-session-id",
      mta_wait_1: ["wait9_1", "wait9_2"],
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runTriplesStep9).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runTriplesStep9).not.toHaveBeenCalled();
    });

    it("should return 200 and call runTriplesStep9 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          wait_5: ["wait5_1", "wait5_2"],
          wait_6: ["wait6_1", "wait6_2"],
        },
      };
      (runTriplesStep9 as any).mockResolvedValue(mockApiResponse);

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
      expect(runTriplesStep9).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        mta_wait_1: body.mta_wait_1,
      });
    });

    it("should return error when runTriplesStep9 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: "Invalid stage",
      };
      (runTriplesStep9 as any).mockResolvedValue(mockApiError);

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

  describe("step_10", () => {
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";
    const endpoint = "/tss/v1/triples/step10";
    const body = {
      session_id: "test-session-id",
      wait_5: ["wait5_1", "wait5_2"],
      wait_6: ["wait6_1", "wait6_2"],
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runTriplesStep10).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runTriplesStep10).not.toHaveBeenCalled();
    });

    it("should return 200 and call runTriplesStep10 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          pub_v: ["pubv1", "pubv2"],
        },
      };
      (runTriplesStep10 as any).mockResolvedValue(mockApiResponse);

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
      expect(runTriplesStep10).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        wait_5: body.wait_5,
        wait_6: body.wait_6,
      });
    });

    it("should return error when runTriplesStep10 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: "Invalid stage",
      };
      (runTriplesStep10 as any).mockResolvedValue(mockApiError);

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

  describe("step_11", () => {
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";
    const endpoint = "/tss/v1/triples/step11";
    const body = {
      session_id: "test-session-id",
      pub_v: ["pubv1", "pubv2"],
    };

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app).post(endpoint).send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
      expect(runTriplesStep11).not.toHaveBeenCalled();
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(endpoint)
        .set("Authorization", "Bearer invalid.token.here")
        .send(body);

      expect(response.status).toBe(401);
      expect(runTriplesStep11).not.toHaveBeenCalled();
    });

    it("should return 200 and call runTriplesStep11 when valid token is provided", async () => {
      const mockApiResponse = {
        success: true,
        data: {
          completed: true,
        },
      };
      (runTriplesStep11 as any).mockResolvedValue(mockApiResponse);

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
      expect(runTriplesStep11).toHaveBeenCalledWith(pool, {
        email: testEmail,
        wallet_id: testWalletId,
        session_id: body.session_id,
        pub_v: body.pub_v,
      });
    });

    it("should return error when runTriplesStep11 fails", async () => {
      const mockApiError = {
        success: false,
        code: "INVALID_TSS_TRIPLES_RESULT",
        msg: "Invalid triples result",
      };
      (runTriplesStep11 as any).mockResolvedValue(mockApiError);

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
