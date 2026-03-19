import { createPgConn } from "@oko-wallet/postgres-lib";
import type { Pool } from "pg";
import request from "supertest";

import { generateUserToken } from "@oko-wallet-api/api/tss/keplr_auth";

import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { userJwtMiddleware } from "@oko-wallet-api/middleware/auth/keplr_auth";
import { makeApp, TEST_ENCRYPTION_SECRET } from "@oko-wallet-api/testing/app";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";

describe("keplr_auth_test", () => {
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
  });

  describe("userJwtMiddleware", () => {
    const testEndpoint = "/test-auth";
    const testEmail = "test@example.com";
    const testWalletId = "wallet123";

    beforeAll(() => {
      app.get(testEndpoint, userJwtMiddleware, (_req: any, res: any) => {
        res.json({ user: res.locals.user });
      });
    });

    it("should authenticate with valid token", async () => {
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
        .get(testEndpoint)
        .set("Authorization", `Bearer ${genTokenRes.data.token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        email: testEmail,
        wallet_id: testWalletId,
      });
    });

    it("should reject request without Authorization header", async () => {
      const response = await request(app).get(testEndpoint);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
    });

    it("should reject request without Bearer token", async () => {
      const response = await request(app)
        .get(testEndpoint)
        .set("Authorization", "InvalidAuth");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
    });

    it("should reject request with invalid token", async () => {
      const response = await request(app)
        .get(testEndpoint)
        .set("Authorization", "Bearer invalid.token.here");

      expect(response.status).toBe(401);
      expect(response.body.error).toBeTruthy();
    });
  });
});
