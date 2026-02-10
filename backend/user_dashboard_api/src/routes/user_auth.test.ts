import { KNOWN_HASH_FROM_0000 } from "@oko-wallet/crypto-js";
import { insertCustomerDashboardUser } from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import { insertCustomer } from "@oko-wallet/oko-pg-interface/customers";
import type {
  CustomerDashboardUser,
  PasswordHash,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Customer } from "@oko-wallet/oko-types/customers";
import { createPgConn } from "@oko-wallet/postgres-lib";
import * as dotenv from "dotenv";
import path from "path";
import type { Pool } from "pg";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";

import { testPgConfig } from "@oko-wallet-usrd-api/database/test_config";
import { makeApp } from "@oko-wallet-usrd-api/testing/app";

dotenv.config({
  path: path.resolve(__dirname, "../../../.env.local"),
  override: false,
});

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret-for-integration-tests";
}

describe("Customer Auth API Integration Tests", () => {
  let app: any;
  let pool: Pool;
  let testCustomer: Customer;
  let testCustomerDashboardUser: CustomerDashboardUser & PasswordHash;

  const TEST_EMAIL = "atmosis@yopmail.com";
  const TEST_CUSTOMER_LABEL = "Test Customer";

  beforeAll(async () => {
    // Setup database connection
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

    app = makeApp();
    app.locals.db = pool;
  });

  beforeEach(async () => {
    // Setup test customer and dashboard user
    const customerId = uuidv4();
    const userId = uuidv4();

    testCustomer = {
      customer_id: customerId,
      label: TEST_CUSTOMER_LABEL,
      status: "ACTIVE",
      url: "",
      logo_url: "",
    };

    testCustomerDashboardUser = {
      user_id: userId,
      customer_id: customerId,
      email: TEST_EMAIL,
      status: "ACTIVE",
      is_email_verified: false,
      password_hash: KNOWN_HASH_FROM_0000,
    };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertCustomerRes = await insertCustomer(client, testCustomer);
      if (!insertCustomerRes.success) {
        throw new Error(insertCustomerRes.err);
      }

      const insertCustomerDashboardUserRes = await insertCustomerDashboardUser(
        client,
        testCustomerDashboardUser,
      );
      if (!insertCustomerDashboardUserRes.success) {
        throw new Error(insertCustomerDashboardUserRes.err);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    // Clean up test data
    const client = await pool.connect();
    try {
      await client.query(
        "DELETE FROM customer_dashboard_users WHERE customer_id = $1",
        [testCustomer.customer_id],
      );
      await client.query("DELETE FROM customers WHERE customer_id = $1", [
        testCustomer.customer_id,
      ]);
      await client.query("DELETE FROM email_verifications WHERE email = $1", [
        TEST_EMAIL,
      ]);
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("POST /customer_dashboard/v1/customer/auth/send-code", () => {
    it("customer_auth: should send verification code successfully for valid email", async () => {
      const response = await request(app)
        .post("/customer_dashboard/v1/customer/auth/send-code")
        .send({
          email: TEST_EMAIL,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it("should return error for missing email", async () => {
      const response = await request(app)
        .post("/customer_dashboard/v1/customer/auth/send-code")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("CUSTOMER_ACCOUNT_NOT_FOUND");
      expect(response.body.msg).toBe("email is required");
    });

    it("should return error for invalid email format", async () => {
      const response = await request(app)
        .post("/customer_dashboard/v1/customer/auth/send-code")
        .send({
          email: "invalid-email",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("INVALID_EMAIL_OR_PASSWORD");
      expect(response.body.msg).toBe("Invalid email format");
    });

    it("should return error for non-existent email", async () => {
      const response = await request(app)
        .post("/customer_dashboard/v1/customer/auth/send-code")
        .send({
          email: "nonexistent@example.com",
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("CUSTOMER_ACCOUNT_NOT_FOUND");
      expect(response.body.msg).toBe("Account not found");
    });
  });
});
