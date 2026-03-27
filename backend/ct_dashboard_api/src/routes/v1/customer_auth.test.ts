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

import { testPgConfig } from "@oko-wallet-ctd-api/database/test_config";
import { makeApp } from "@oko-wallet-ctd-api/testing/app";

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
      role: "admin",
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

  /*

  describe('POST /customer_dashboard/v1/customer/auth/verify-login', () => {
  it('should return error for missing email or verification code', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/verify-login')
  .send({
    email: TEST_EMAIL,
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('CUSTOMER_ACCOUNT_NOT_FOUND');
  expect(response.body.msg).toBe('email and verification_code are required');
  });

  it('should return error for invalid verification code format', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/verify-login')
  .send({
    email: TEST_EMAIL,
    verification_code: '12345', // only 5 digits
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('INVALID_VERIFICATION_CODE');
  expect(response.body.msg).toBe('Verification code must be 6 digits');
  });

  it('should return error for non-numeric verification code', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/verify-login')
  .send({
    email: TEST_EMAIL,
    verification_code: 'abc123',
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('INVALID_VERIFICATION_CODE');
  expect(response.body.msg).toBe('Verification code must be 6 digits');
  });

  it('should return error for wrong verification code', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/verify-login')
  .send({
    email: TEST_EMAIL,
    verification_code: '123456',
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  // Error code depends on implementation
  });
  });

  describe('POST /customer_dashboard/v1/customer/auth/signin', () => {
  beforeEach(async () => {
  // Set email as verified for signin tests
  const client = await pool.connect();
  try {
  await client.query(
    'UPDATE customer_dashboard_users SET is_email_verified = true WHERE user_id = $1',
    [testCustomerDashboardUser.user_id]
  );
  } finally {
  client.release();
  }
  });

  it('should sign in successfully with valid credentials', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/signin')
  .send({
    email: TEST_EMAIL,
    password: '0000', // KNOWN_HASH_FROM_0000 corresponds to password '0000'
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
  expect(response.body.data.token).toBeDefined();
  });

  it('should return error for missing email or password', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/signin')
  .send({
    email: TEST_EMAIL,
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('INVALID_EMAIL_OR_PASSWORD');
  expect(response.body.msg).toBe('email and password are required');
  });

  it('should return error for invalid email format', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/signin')
  .send({
    email: 'invalid-email',
    password: '0000',
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('INVALID_EMAIL_OR_PASSWORD');
  expect(response.body.msg).toBe('Invalid email format');
  });

  it('should return error for wrong password', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/signin')
  .send({
    email: TEST_EMAIL,
    password: 'wrong-password',
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('INVALID_EMAIL_OR_PASSWORD');
  });

  it('should return error for non-existent email', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/signin')
  .send({
    email: 'nonexistent@example.com',
    password: '0000',
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('CUSTOMER_ACCOUNT_NOT_FOUND');
  });
  });

  describe('POST /customer_dashboard/v1/customer/auth/change-password', () => {
  it('should change password successfully', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/change-password')
  .send({
    email: TEST_EMAIL,
    new_password: 'newpassword123',
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
  });

  it('should return error for missing email or new_password', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/change-password')
  .send({
    email: TEST_EMAIL,
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('CUSTOMER_ACCOUNT_NOT_FOUND');
  expect(response.body.msg).toBe('email and new_password are required');
  });

  it('should return error for invalid email format', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/change-password')
  .send({
    email: 'invalid-email',
    new_password: 'newpassword123',
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('INVALID_EMAIL_OR_PASSWORD');
  expect(response.body.msg).toBe('Invalid email format');
  });

  it('should return error for weak password', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/change-password')
  .send({
    email: TEST_EMAIL,
    new_password: '123', // less than 8 characters
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('INVALID_EMAIL_OR_PASSWORD');
  expect(response.body.msg).toMatch(/Password must be at least \d+ characters long/);
  });

  it('should return error for non-existent email', async () => {
  const response = await request(app)
  .post('/customer_dashboard/v1/customer/auth/change-password')
  .send({
    email: 'nonexistent@example.com',
    new_password: 'newpassword123',
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(false);
  expect(response.body.code).toBe('CUSTOMER_ACCOUNT_NOT_FOUND');
  });
  });

  describe('Customer Auth Flow Integration', () => {
  it('should complete full auth flow: send code -> verify -> change password', async () => {
  // Step 1: Send verification code
  const sendCodeResponse = await request(app)
  .post('/customer_dashboard/v1/customer/auth/send-code')
  .send({
    email: TEST_EMAIL,
  });

  expect(sendCodeResponse.status).toBe(200);
  expect(sendCodeResponse.body.success).toBe(true);

  // Note: In real implementation, we would need to:
  // 1. Get the actual verification code from database or mock email service
  // 2. Use that code in verify-login
  // 3. Then use the returned token to change password

  // For now, we test the flow structure
  expect(sendCodeResponse.body.data).toBeDefined();
  });

  it('should handle signin flow for verified users', async () => {
  // Set user as verified
  const client = await pool.connect();
  try {
  await client.query(
    'UPDATE customer_dashboard_users SET is_email_verified = true WHERE user_id = $1',
    [testCustomerDashboardUser.user_id]
  );
  } finally {
  client.release();
  }

  // Sign in
  const signinResponse = await request(app)
  .post('/customer_dashboard/v1/customer/auth/signin')
  .send({
    email: TEST_EMAIL,
    password: '0000',
  });

  expect(signinResponse.status).toBe(200);
  expect(signinResponse.body.success).toBe(true);
  expect(signinResponse.body.data.token).toBeDefined();

  // Token should be valid for 1 hour as per requirements
  expect(signinResponse.body.data.token).toMatch(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/);
  });
  });

  */
});
