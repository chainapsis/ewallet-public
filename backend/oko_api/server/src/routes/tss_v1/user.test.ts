import { jest } from "@jest/globals";
import request from "supertest";
import type { Pool } from "pg";
import { createUser } from "@oko-wallet/oko-pg-interface/oko_users";
import { createPgConn } from "@oko-wallet/postgres-lib";
import type { WalletStatus } from "@oko-wallet/oko-types/wallets";
import type { KeyShareNode } from "@oko-wallet/oko-types/tss";
import {
  insertKSNode,
  createWalletKSNodes,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import {
  createWallet,
  updateWalletStatus,
} from "@oko-wallet/oko-pg-interface/oko_wallets";
import { insertKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";

import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";
import { TEMP_ENC_SECRET } from "@oko-wallet-api/api/tss/utils";

const SSS_THRESHOLD = 2;

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
  };
  next();
});

await jest.unstable_mockModule("@oko-wallet-api/middleware/auth/oauth", () => ({
  oauthMiddleware: (req: any, res: any, next: any) =>
    mockOauthMiddleware(req, res, next),
}));

await jest.unstable_mockModule(
  "@oko-wallet-api/middleware/auth/tss_activate",
  () => ({
    tssActivateMiddleware: (_req: any, _res: any, next: any) => next(),
  }),
);

async function setUpKSNodes(pool: Pool): Promise<KeyShareNode[]> {
  const ksNodeNames = ["ksNode1", "ksNode2"];
  const ksNodes: KeyShareNode[] = [];
  const createKSNodesRes = await Promise.all(
    ksNodeNames.map((ksNodeName) =>
      insertKSNode(pool, ksNodeName, `http://test.com/${ksNodeName}`),
    ),
  );
  for (const res of createKSNodesRes) {
    if (res.success === false) {
      console.error(res);
      throw new Error("Failed to create ks nodes");
    }
    ksNodes.push(res.data);
  }

  return ksNodes;
}

// Dynamically import after jest.unstable_mockModule to apply ESM mocks correctly
const { makeApp } = await import("@oko-wallet-api/testing/app");

describe("user_route_test", () => {
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
    await insertKeyShareNodeMeta(pool, {
      sss_threshold: SSS_THRESHOLD,
    });
  });

  describe("check_email", () => {
    const testEndpoint = "/tss/v1/user/check";

    it("should return false when user does not exist", async () => {
      const email = "nonexistent@example.com";
      const ksNodes = await setUpKSNodes(pool);

      const response = await request(app).post(`${testEndpoint}`).send({
        email,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(false);
      const endpoints = response.body.data.keyshare_node_meta.nodes.map(
        (n: any) => n.endpoint,
      );
      expect(endpoints.length).toEqual(ksNodes.length);
      expect(endpoints).toContain(ksNodes[0].server_url);
      expect(endpoints).toContain(ksNodes[1].server_url);
    });

    it("should return false when user exists but wallet does not", async () => {
      const email = "test@example.com";
      const ksNodes = await setUpKSNodes(pool);

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      const response = await request(app).post(`${testEndpoint}`).send({
        email,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(false);
      const endpoints2 = response.body.data.keyshare_node_meta.nodes.map(
        (n: any) => n.endpoint,
      );
      expect(endpoints2.length).toEqual(ksNodes.length);
      expect(endpoints2).toContain(ksNodes[0].server_url);
      expect(endpoints2).toContain(ksNodes[1].server_url);
    });

    it("should return false when user exists but wallet status is INACTIVE", async () => {
      const email = "test@example.com";
      const publicKey = "test_public_key";
      const ksNodes = await setUpKSNodes(pool);

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from(publicKey, "utf-8"),
        enc_tss_share: Buffer.from("test_private_share", "utf-8"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error("Failed to create wallet");
      }

      const updateWalletStatusRes = await updateWalletStatus(
        pool,
        createWalletRes.data.wallet_id,
        "INACTIVE" as WalletStatus,
      );
      if (updateWalletStatusRes.success === false) {
        throw new Error("Failed to update wallet status");
      }

      const response = await request(app).post(`${testEndpoint}`).send({
        email,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(false);
      const endpoints2a = response.body.data.keyshare_node_meta.nodes.map(
        (n: any) => n.endpoint,
      );
      expect(endpoints2a.length).toEqual(ksNodes.length);
      expect(endpoints2a).toContain(ksNodes[0].server_url);
      expect(endpoints2a).toContain(ksNodes[1].server_url);
    });

    it("should return true when wallet is active", async () => {
      const email = "test@example.com";
      const publicKey = "test_public_key";
      const ksNodes = await setUpKSNodes(pool);

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }
      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from(publicKey, "utf-8"),
        enc_tss_share: Buffer.from("test_private_share", "utf-8"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error("Failed to create wallet");
      }

      const createWalletKSNodesRes = await createWalletKSNodes(
        pool,
        createWalletRes.data.wallet_id,
        [ksNodes[0].node_id],
      );
      if (createWalletKSNodesRes.success === false) {
        throw new Error("Failed to create wallet ks nodes");
      }

      const response = await request(app).post(`${testEndpoint}`).send({
        email,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(true);
      const endpoints3 = response.body.data.keyshare_node_meta.nodes.map(
        (n: any) => n.endpoint,
      );
      expect(endpoints3).toContain(ksNodes[0].server_url);
    });
  });

  describe("signin", () => {
    const testEndpoint = "/tss/v1/user/signin";
    const validToken = "valid_token";
    const invalidToken = "invalid_token";

    it("should return 401 when no authorization header is provided", async () => {
      const response = await request(app)
        .post(testEndpoint)
        .send({ auth_type: "google" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(
        "Authorization header with Bearer token required",
      );
    });

    it("should return 401 when invalid token is provided", async () => {
      const response = await request(app)
        .post(testEndpoint)
        .set("Authorization", `Bearer ${invalidToken}`)
        .send({ auth_type: "google" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid token");
    });

    it("should return 404 when user does not exist", async () => {
      const response = await request(app)
        .post(testEndpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ auth_type: "google" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        code: "USER_NOT_FOUND",
        msg: "User not found: test@example.com (auth_type: google)",
      });
    });

    it("should return 404 when user exists but wallet does not", async () => {
      // Create a user without a wallet
      const email = "test@example.com";
      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      const response = await request(app)
        .post(testEndpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ auth_type: "google" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: "Wallet not found: test@example.com",
      });
    });

    it("should return 404 when user exists but wallet status is INACTIVE", async () => {
      // Create a user without a wallet
      const email = "test@example.com";
      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from("test_public_key", "utf-8"),
        enc_tss_share: Buffer.from("test_private_share", "utf-8"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error("Failed to create wallet");
      }

      const updateWalletStatusRes = await updateWalletStatus(
        pool,
        createWalletRes.data.wallet_id,
        "INACTIVE" as WalletStatus,
      );
      if (updateWalletStatusRes.success === false) {
        throw new Error("Failed to update wallet status");
      }

      const response = await request(app)
        .post(testEndpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ auth_type: "google" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        code: "WALLET_NOT_FOUND",
        msg: "Wallet not found: test@example.com",
      });
    });

    it("should return 200 with token when signin is successful", async () => {
      // Create a user and wallet
      const email = "test@example.com";
      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from("test_public_key", "utf-8"),
        enc_tss_share: Buffer.from("test_private_share", "utf-8"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error("Failed to create wallet");
      }

      const response = await request(app)
        .post(testEndpoint)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ auth_type: "google" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data.user).toHaveProperty("email", email);
      expect(response.body.data.user).toHaveProperty(
        "wallet_id",
        createWalletRes.data.wallet_id,
      );
    });
  });
});
