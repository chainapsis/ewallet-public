import { jest } from "@jest/globals";
import { Pool } from "pg";
import type { Logger } from "winston";
import { createPgConn } from "@oko-wallet/postgres-lib";
import { createUser } from "@oko-wallet/oko-pg-interface/oko_users";
import type { WalletStatus } from "@oko-wallet/oko-types/wallets";
import { type KeyShareNode } from "@oko-wallet/oko-types/tss";
import {
  insertKSNode,
  createWalletKSNodes,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import {
  createWallet,
  updateWalletStatus,
} from "@oko-wallet/oko-pg-interface/oko_wallets";
import { insertKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";

import { resetPgDatabase } from "@oko-wallet-api/testing/database";
import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { checkEmail, signIn } from "@oko-wallet-api/api/tss/v1/user";

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

const SSS_THRESHOLD = 2;

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

describe("user_test", () => {
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
  });

  beforeEach(async () => {
    await resetPgDatabase(pool);
    await insertKeyShareNodeMeta(pool, {
      sss_threshold: SSS_THRESHOLD,
    });
  });

  describe("signIn", () => {
    it("should return USER_NOT_FOUND when user does not exist", async () => {
      const email = "nonexistent@example.com";
      const signInRes = await signIn(
        pool,
        email,
        "google",
        {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
        mockLogger,
      );

      if (signInRes.success === true) {
        throw new Error("signIn should fail");
      }

      expect(signInRes.success).toBe(false);
      expect(signInRes.code).toBe("USER_NOT_FOUND");
      expect(signInRes.msg).toBe(`User not found: ${email} (auth_type: google)`);
    });

    it("should return WALLET_NOT_FOUND when user exists but wallet does not", async () => {
      const email = "test@example.com";
      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      const signInRes = await signIn(
        pool,
        email,
        "google",
        {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
        mockLogger,
        email,
      );

      if (signInRes.success === true) {
        throw new Error("signIn should fail");
      }

      expect(signInRes.success).toBe(false);
      expect(signInRes.code).toBe("WALLET_NOT_FOUND");
      expect(signInRes.msg).toBe(`Wallet not found: ${email}`);
    });

    it("should return WALLET_NOT_FOUND when user exists but wallet is not active", async () => {
      const email = "test@example.com";
      const publicKey = "test_public_key";

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

      const signInRes = await signIn(
        pool,
        email,
        "google",
        {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
        mockLogger,
        email,
      );

      if (signInRes.success === true) {
        throw new Error("signIn should fail");
      }

      expect(signInRes.success).toBe(false);
      expect(signInRes.code).toBe("WALLET_NOT_FOUND");
      expect(signInRes.msg).toBe(`Wallet not found: ${email}`);
    });

    it("should return success with token and user info when signin is successful", async () => {
      const email = "test@example.com";
      const publicKey = "test_public_key";

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

      const signInRes = await signIn(
        pool,
        email,
        "google",
        {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
        mockLogger,
        email,
      );

      if (signInRes.success === false) {
        throw new Error("signIn should succeed");
      }

      expect(signInRes.success).toBe(true);
      expect(signInRes.data).toBeDefined();
      expect(signInRes.data.token).toBeDefined();
      expect(signInRes.data.user).toBeDefined();
      expect(signInRes.data.user.email).toBe(email);
      expect(signInRes.data.user.wallet_id).toBe(
        createWalletRes.data.wallet_id,
      );
    });

    it("should handle database error from getUserByEmailAndAuthType", async () => {
      // force database error by closing the pool
      await pool.end();

      const email = "test@example.com";
      const signInRes = await signIn(
        pool,
        email,
        "google",
        {
          secret: "test-jwt-secret",
          expires_in: "1h",
        },
        mockLogger,
        email,
      );

      if (signInRes.success === true) {
        throw new Error("signIn should fail");
      }

      expect(signInRes.success).toBe(false);
      expect(signInRes.code).toBe("UNKNOWN_ERROR");
      expect(signInRes.msg).toContain("getUserByEmailAndAuthType error");

      // recreate pool
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
        throw new Error("Failed to recreate postgres database");
      }

      pool = createPostgresRes.data;
    });
  });

  describe("checkEmail", () => {
    it("should return exists false when user does not exist", async () => {
      const email = "nonexistent@example.com";
      const ksNodes = await setUpKSNodes(pool);

      const checkEmailRes = await checkEmail(pool, email, "google");
      if (checkEmailRes.success === false) {
        throw new Error("checkEmail should succeed");
      }

      expect(checkEmailRes.success).toBe(true);
      expect(checkEmailRes.data.exists).toBe(false);
      const endpoints = checkEmailRes.data.keyshare_node_meta.nodes.map(
        (n) => n.endpoint,
      );
      expect(endpoints.length).toEqual(ksNodes.length);
      expect(endpoints).toContain(ksNodes[0].server_url);
      expect(endpoints).toContain(ksNodes[1].server_url);
    });

    it("should return exists false when wallet does not exist", async () => {
      const email = "nonexistent@example.com";
      const ksNodes = await setUpKSNodes(pool);

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      const checkEmailRes = await checkEmail(pool, email, "google");
      if (checkEmailRes.success === false) {
        throw new Error("checkEmail should succeed");
      }

      expect(checkEmailRes.success).toBe(true);
      expect(checkEmailRes.data.exists).toBe(false);
      const endpoints2 = checkEmailRes.data.keyshare_node_meta.nodes.map(
        (n) => n.endpoint,
      );
      expect(endpoints2.length).toEqual(ksNodes.length);
      expect(endpoints2).toContain(ksNodes[0].server_url);
      expect(endpoints2).toContain(ksNodes[1].server_url);
    });

    it("should return exists false when wallet is not active", async () => {
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

      const checkEmailRes = await checkEmail(pool, email, "google");
      if (checkEmailRes.success === false) {
        throw new Error("checkEmail should succeed");
      }

      expect(checkEmailRes.success).toBe(true);
      expect(checkEmailRes.data.exists).toBe(false);
      const endpoints3 = checkEmailRes.data.keyshare_node_meta.nodes.map(
        (n) => n.endpoint,
      );
      expect(endpoints3).toContain(ksNodes[0].server_url);
      expect(endpoints3).toContain(ksNodes[1].server_url);
      expect(endpoints3.length).toEqual(ksNodes.length);
    });

    it("should return exists true when wallet exists and is active", async () => {
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

      const checkEmailRes = await checkEmail(pool, email, "google");
      if (checkEmailRes.success === false) {
        throw new Error("checkEmail should succeed");
      }

      expect(checkEmailRes.success).toBe(true);
      expect(checkEmailRes.data.exists).toBe(true);
      const endpoints4 = checkEmailRes.data.keyshare_node_meta.nodes.map(
        (n) => n.endpoint,
      );
      expect(endpoints4).toContain(ksNodes[0].server_url);
    });

    it("should set needs_reshare=true when UNRECOVERABLE exists", async () => {
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
        [ksNodes[0].node_id, ksNodes[1].node_id],
      );
      if (createWalletKSNodesRes.success === false) {
        throw new Error("Failed to create wallet ks nodes");
      }

      // Mark one mapping as UNRECOVERABLE
      await pool.query(
        `UPDATE wallet_ks_nodes SET status = 'UNRECOVERABLE_DATA_LOSS', updated_at = now() 
           WHERE wallet_id = $1 AND node_id = $2`,
        [createWalletRes.data.wallet_id, ksNodes[0].node_id],
      );

      const checkEmailRes = await checkEmail(pool, email, "google");
      if (checkEmailRes.success === false) {
        throw new Error("checkEmail should succeed");
      }

      expect(checkEmailRes.data.exists).toBe(true);
      expect(checkEmailRes.data.needs_reshare).toBe(true);
      expect(checkEmailRes.data.active_nodes_below_threshold).toBe(true);
      expect(checkEmailRes.data.reshare_reasons).toContain(
        "UNRECOVERABLE_NODE_DATA_LOSS",
      );

      // Should return all active nodes
      const endpoints = checkEmailRes.data.keyshare_node_meta.nodes.map(
        (n) => n.endpoint,
      );
      expect(endpoints.length).toEqual(ksNodes.length);
      expect(endpoints).toContain(ksNodes[0].server_url);
      expect(endpoints).toContain(ksNodes[1].server_url);

      // Verify wallet_status mapping
      const nodes = checkEmailRes.data.keyshare_node_meta.nodes;
      const node0 = nodes.find((n) => n.endpoint === ksNodes[0].server_url);
      const node1 = nodes.find((n) => n.endpoint === ksNodes[1].server_url);
      expect(node0?.wallet_status).toBe("UNRECOVERABLE_DATA_LOSS");
      expect(node1?.wallet_status).toBe("ACTIVE");
    });

    it("should set needs_reshare=true when new node is added", async () => {
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

      // Link only first node to wallet
      const createWalletKSNodesRes = await createWalletKSNodes(
        pool,
        createWalletRes.data.wallet_id,
        [ksNodes[0].node_id],
      );
      if (createWalletKSNodesRes.success === false) {
        throw new Error("Failed to create wallet ks nodes");
      }

      const checkEmailRes = await checkEmail(pool, email, "google");
      if (checkEmailRes.success === false) {
        throw new Error("checkEmail should succeed");
      }

      expect(checkEmailRes.data.exists).toBe(true);
      expect(checkEmailRes.data.needs_reshare).toBe(true);
      expect(checkEmailRes.data.reshare_reasons).toContain("NEW_NODE_ADDED");

      // Should return all active nodes
      const endpoints = checkEmailRes.data.keyshare_node_meta.nodes.map(
        (n) => n.endpoint,
      );
      expect(endpoints.length).toEqual(ksNodes.length);
      expect(endpoints).toContain(ksNodes[0].server_url);
      expect(endpoints).toContain(ksNodes[1].server_url);

      // Verify wallet_status mapping
      const nodes = checkEmailRes.data.keyshare_node_meta.nodes;
      const node0 = nodes.find((n) => n.endpoint === ksNodes[0].server_url);
      const node1 = nodes.find((n) => n.endpoint === ksNodes[1].server_url);
      expect(node0?.wallet_status).toBe("ACTIVE");
      expect(node1?.wallet_status).toBe("NOT_REGISTERED");
    });

    it("should set active_nodes_below_threshold=true without triggering reshare when below threshold", async () => {
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
        // more than the number of KS nodes
        sss_threshold: 3,
      });
      if (createWalletRes.success === false) {
        throw new Error("Failed to create wallet");
      }

      // Only one active mapping
      const createWalletKSNodesRes = await createWalletKSNodes(
        pool,
        createWalletRes.data.wallet_id,
        [ksNodes[0].node_id, ksNodes[1].node_id],
      );
      if (createWalletKSNodesRes.success === false) {
        throw new Error("Failed to create wallet ks nodes");
      }

      const checkEmailRes = await checkEmail(pool, email, "google");
      if (checkEmailRes.success === false) {
        throw new Error("checkEmail should succeed");
      }

      expect(checkEmailRes.data.exists).toBe(true);
      expect(checkEmailRes.data.needs_reshare).toBe(false);
      expect(checkEmailRes.data.active_nodes_below_threshold).toBe(true);

      // Should return only active wallet nodes
      const nodes = checkEmailRes.data.keyshare_node_meta.nodes;
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes.every((n) => n.wallet_status === "ACTIVE")).toBe(true);
    });
  });
});
