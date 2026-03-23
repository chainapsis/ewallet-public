import { jest } from "@jest/globals";
import { createPgConn } from "@oko-wallet/postgres-lib";
import type { Pool } from "pg";
import request from "supertest";

import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { TEST_ENCRYPTION_SECRET } from "@oko-wallet-api/testing/constants";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";

const mockRunKeygen = jest.fn() as jest.Mock;
const mockRunKeygenV2 = jest.fn() as jest.Mock;
const mockRunKeygenEd25519 = jest.fn() as jest.Mock;

await jest.unstable_mockModule("@oko-wallet-api/api/tss/v1/keygen", () => ({
  runKeygen: mockRunKeygen,
  runKeygenV2: mockRunKeygenV2,
  runKeygenEd25519: mockRunKeygenEd25519,
}));

const mockOauthMiddleware = jest.fn((req: any, res: any, next: any) => {
  if (!req.headers.authorization) {
    return res
      .status(401)
      .json({ error: "Authorization header with Bearer token required" });
  }
  if (!req.headers.authorization.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Authorization header with Bearer token required" });
  }
  const token = req.headers.authorization.substring(7);
  if (token === "invalid_token") {
    return res.status(401).json({ error: "Invalid token" });
  }
  if (!req.body?.auth_type) {
    return res
      .status(400)
      .json({ error: "auth_type is required in request body" });
  }
  res.locals.oauth_user = {
    type: req.body.auth_type,
    user_identifier: "test@example.com",
    email: "test@example.com",
    name: "Test User",
    sub: "test123",
  };
  next();
});

await jest.unstable_mockModule("@oko-wallet-api/middleware/auth/oauth", () => ({
  oauthMiddleware: (req: any, res: any, next: any) =>
    mockOauthMiddleware(req, res, next),
}));

const TEST_CUSTOMER_ID = "test-customer-id";

await jest.unstable_mockModule(
  "@oko-wallet-api/middleware/auth/api_key_auth",
  () => ({
    apiKeyMiddleware: (req: any, res: any, next: any) => {
      const apiKey = req.headers["x-api-key"];
      if (!apiKey) {
        return res.status(401).json({ error: "API key is required" });
      }
      res.locals.api_key = {
        customer_id: TEST_CUSTOMER_ID,
        is_active: true,
      };
      next();
    },
  }),
);

await jest.unstable_mockModule(
  "@oko-wallet-api/middleware/auth/tss_activate",
  () => ({
    tssActivateMiddleware: (_req: any, _res: any, next: any) => next(),
  }),
);

// Dynamically import after jest.unstable_mockModule to apply ESM mocks correctly
const { makeApp } = await import("@oko-wallet-api/testing/app");

describe("keygen_v1_route_test", () => {
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
      ENCRYPTION_SECRET: TEST_ENCRYPTION_SECRET,
    });
    app.locals.db = pool;
  });

  beforeEach(async () => {
    await resetPgDatabase(pool);
    jest.clearAllMocks();
  });

  const testEndpoint = "/tss/v1/keygen";
  const validToken = "valid_token";
  const invalidToken = "invalid_token";
  const validApiKey = "test-api-key";

  const testKeygenBody = {
    auth_type: "google",
    keygen_2: {
      private_share: "test_private_share",
      public_key: "test_public_key",
    },
  };

  describe("keygen", () => {
    it("should return 401 when no API key is provided", async () => {
      const response = await request(app)
        .post(testEndpoint)
        .send(testKeygenBody);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("API key is required");
    });

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app)
        .post(testEndpoint)
        .set("x-api-key", validApiKey)
        .send(testKeygenBody);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(testEndpoint)
        .set("x-api-key", validApiKey)
        .set("Authorization", `Bearer ${invalidToken}`)
        .send(testKeygenBody);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid token");
    });

    it("should return 200 when keygen request is successful", async () => {
      const mockResponse = {
        success: true,
        data: {
          token: "test_token",
          user: {
            user_identifier: "test@example.com",
            email: "test@example.com",
            wallet_id: "test_wallet_id",
            public_key: "test_public_key",
          },
        },
      };

      (mockRunKeygen as any).mockResolvedValue(Promise.resolve(mockResponse));

      const response = await request(app)
        .post(testEndpoint)
        .set("x-api-key", validApiKey)
        .set("Authorization", `Bearer ${validToken}`)
        .send(testKeygenBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockResponse.data,
      });

      expect(mockRunKeygen).toHaveBeenCalledWith(
        pool,
        {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
        {
          auth_type: "google",
          user_identifier: "test@example.com",
          email: "test@example.com",
          keygen_2: testKeygenBody.keygen_2,
          name: "Test User",
        },
        TEST_ENCRYPTION_SECRET,
        expect.anything(),
        TEST_CUSTOMER_ID,
      );
    });

    it("should return error when runKeygen fails", async () => {
      const mockError = {
        success: false,
        code: "DUPLICATE_PUBLIC_KEY",
        msg: "Duplicate public key: test_public_key",
      };

      (mockRunKeygen as any).mockResolvedValue(Promise.resolve(mockError));

      const response = await request(app)
        .post(testEndpoint)
        .set("x-api-key", validApiKey)
        .set("Authorization", `Bearer ${validToken}`)
        .send(testKeygenBody);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        code: mockError.code,
        msg: mockError.msg,
      });

      expect(mockRunKeygen).toHaveBeenCalledWith(
        pool,
        {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
        {
          auth_type: "google",
          user_identifier: "test@example.com",
          email: "test@example.com",
          keygen_2: testKeygenBody.keygen_2,
          name: "Test User",
        },
        TEST_ENCRYPTION_SECRET,
        expect.anything(),
        TEST_CUSTOMER_ID,
      );
    });
  });
});
