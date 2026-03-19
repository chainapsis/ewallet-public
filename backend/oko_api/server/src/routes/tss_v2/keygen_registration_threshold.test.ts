import { jest } from "@jest/globals";
import { napiRunKeygenClientCentralized } from "@oko-wallet/cait-sith-keplr-addon/addon";
import { insertCustomer } from "@oko-wallet/oko-pg-interface/customers";
import { insertKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";
import {
  getWalletKSNodesByWalletId,
  insertKSNode,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import { createPgConn } from "@oko-wallet/postgres-lib";
import { Participant } from "@oko-wallet/tecdsa-interface";
import { runKeygenCentralizedEd25519 } from "@oko-wallet/teddsa-addon/src/server";
import type { Pool } from "pg";
import request from "supertest";

import { TEST_CUSTOMER } from "@oko-wallet-api/api/tss/tests";
import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { TEST_ENCRYPTION_SECRET } from "@oko-wallet-api/testing/constants";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";

// ── Mocks ───────────────────────────────────────────────────────────────

const mockCheckKeyShareFromKSNodesV2 = jest.fn() as jest.Mock;

const mockCheckKeyShareFromKSNodes = jest.fn();

await jest.unstable_mockModule("@oko-wallet-api/api/tss/ks_node", () => ({
  checkKeyShareFromKSNodes: mockCheckKeyShareFromKSNodes,
  checkKeyShareFromKSNodesV2: mockCheckKeyShareFromKSNodesV2,
}));

const TEST_CUSTOMER_ID = "test-customer-id";

await jest.unstable_mockModule(
  "@oko-wallet-api/middleware/auth/api_key_auth",
  () => ({
    apiKeyMiddleware: (_req: any, res: any, next: any) => {
      res.locals.api_key = {
        customer_id: TEST_CUSTOMER_ID,
        is_active: true,
      };
      next();
    },
  }),
);

await jest.unstable_mockModule("@oko-wallet-api/middleware/auth/oauth", () => ({
  oauthMiddleware: (_req: any, res: any, next: any) => {
    res.locals.oauth_user = {
      type: "google",
      user_identifier: "e2e-test@example.com",
      email: "e2e-test@example.com",
      name: "E2E Test User",
    };
    next();
  },
}));

await jest.unstable_mockModule(
  "@oko-wallet-api/middleware/auth/tss_activate",
  () => ({
    tssActivateMiddleware: (_req: any, _res: any, next: any) => next(),
  }),
);

await jest.unstable_mockModule(
  "@oko-wallet-api/middleware/commit_reveal",
  () => ({
    commitRevealMiddleware: () => (_req: any, _res: any, next: any) => next(),
  }),
);

const { makeApp } = await import("@oko-wallet-api/testing/app");

// ── Fixtures ────────────────────────────────────────────────────────────

const SSS_THRESHOLD = 2;
const TEST_SEED_SHARE = "a".repeat(64) + "b".repeat(64);

function buildKeygenBody() {
  const secp256k1KeygenResult = napiRunKeygenClientCentralized();
  const ed25519KeygenResult = runKeygenCentralizedEd25519();
  const keygen2Secp = secp256k1KeygenResult.keygen_outputs[Participant.P1];
  const keygen2Ed = ed25519KeygenResult.keygen_outputs[Participant.P1];

  return {
    auth_type: "google",
    keygen_2_secp256k1: {
      public_key: keygen2Secp.public_key,
      private_share: keygen2Secp.private_share,
    },
    keygen_2_ed25519: {
      key_package: keygen2Ed.key_package,
      public_key_package: keygen2Ed.public_key_package,
      identifier: [...keygen2Ed.identifier],
      public_key: [...ed25519KeygenResult.public_key],
    },
    ed25519_seed_share: TEST_SEED_SHARE,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("keygen_v2_registration_threshold_e2e", () => {
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

  afterAll(async () => {
    await pool.end();
  });

  async function setUpKSNodes(count: number): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const res = await insertKSNode(
        pool,
        `ksNode${i + 1}`,
        `http://test.com/ksNode${i + 1}`,
      );
      if (res.success === false) {
        throw new Error("Failed to create ks node");
      }
      ids.push(res.data.node_id);
    }
    return ids;
  }

  async function createTestCustomer(): Promise<string> {
    const res = await insertCustomer(pool, TEST_CUSTOMER);
    if (res.success === false) {
      throw new Error("Failed to insert customer");
    }
    return res.data.customer_id;
  }

  describe("partial success (registration_threshold=2)", () => {
    it("should return 200 and register only successful nodes", async () => {
      // Setup: threshold=2, 3 KS nodes
      await insertKeyShareNodeMeta(pool, {
        sss_threshold: SSS_THRESHOLD,
        registration_threshold: 2,
      });
      const ksNodeIds = await setUpKSNodes(3);
      await createTestCustomer();

      // Mock: only first 2 nodes succeed
      const successNodeIds = [ksNodeIds[0], ksNodeIds[1]];
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          secp256k1: { nodeIds: successNodeIds },
          ed25519: { nodeIds: successNodeIds },
        },
      });

      const body = buildKeygenBody();

      const response = await request(app)
        .post("/tss/v2/keygen")
        .send(body)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.wallet_id_secp256k1).toBeDefined();
      expect(response.body.data.user.wallet_id_ed25519).toBeDefined();
      expect(response.body.data.token).toBeDefined();

      // Verify only 2 nodes registered for each wallet
      const secp256k1Res = await getWalletKSNodesByWalletId(
        pool,
        response.body.data.user.wallet_id_secp256k1,
      );
      if (secp256k1Res.success === false) {
        throw new Error("Failed to get wallet ks nodes");
      }
      expect(secp256k1Res.data).toHaveLength(2);
      expect(secp256k1Res.data.map((n) => n.node_id).sort()).toEqual(
        successNodeIds.sort(),
      );

      const ed25519Res = await getWalletKSNodesByWalletId(
        pool,
        response.body.data.user.wallet_id_ed25519,
      );
      if (ed25519Res.success === false) {
        throw new Error("Failed to get wallet ks nodes");
      }
      expect(ed25519Res.data).toHaveLength(2);
      expect(ed25519Res.data.map((n) => n.node_id).sort()).toEqual(
        successNodeIds.sort(),
      );

      // Verify registrationThreshold was passed to checkKeyShareFromKSNodesV2
      expect(mockCheckKeyShareFromKSNodesV2).toHaveBeenCalledTimes(1);
      const callArgs = mockCheckKeyShareFromKSNodesV2.mock.calls[0];
      expect(callArgs[4]).toBe(2);
    });
  });

  describe("threshold not met (registration_threshold=2, only 1 success)", () => {
    it("should return error when checkKeyShareFromKSNodesV2 fails", async () => {
      await insertKeyShareNodeMeta(pool, {
        sss_threshold: SSS_THRESHOLD,
        registration_threshold: 2,
      });
      await setUpKSNodes(3);
      await createTestCustomer();

      // Mock: checkKeyShareFromKSNodesV2 returns failure (threshold not met)
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: false,
        code: "KEYSHARE_NODE_INSUFFICIENT",
        msg: "secp256k1: 1/3 nodes succeeded (need 2)",
      });

      const body = buildKeygenBody();

      const response = await request(app)
        .post("/tss/v2/keygen")
        .send(body)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
      expect(response.body.msg).toContain("1/3 nodes succeeded");
    });
  });

  describe("null threshold fallback (all-or-nothing)", () => {
    it("should use all-or-nothing mode and return all nodeIds", async () => {
      await insertKeyShareNodeMeta(pool, {
        sss_threshold: SSS_THRESHOLD,
        registration_threshold: null,
      });
      const ksNodeIds = await setUpKSNodes(2);
      await createTestCustomer();

      // Mock: all nodes succeed
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          secp256k1: { nodeIds: ksNodeIds },
          ed25519: { nodeIds: ksNodeIds },
        },
      });

      const body = buildKeygenBody();

      const response = await request(app)
        .post("/tss/v2/keygen")
        .send(body)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify all nodes registered
      const secp256k1Res = await getWalletKSNodesByWalletId(
        pool,
        response.body.data.user.wallet_id_secp256k1,
      );
      if (secp256k1Res.success === false) {
        throw new Error("Failed to get wallet ks nodes");
      }
      expect(secp256k1Res.data).toHaveLength(2);

      // Verify registrationThreshold was passed as null
      expect(mockCheckKeyShareFromKSNodesV2).toHaveBeenCalledTimes(1);
      const callArgs = mockCheckKeyShareFromKSNodesV2.mock.calls[0];
      expect(callArgs[4]).toBeNull();
    });

    it("should fail when any node fails in all-or-nothing mode", async () => {
      await insertKeyShareNodeMeta(pool, {
        sss_threshold: SSS_THRESHOLD,
        registration_threshold: null,
      });
      await setUpKSNodes(2);
      await createTestCustomer();

      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: false,
        code: "KEYSHARE_NODE_INSUFFICIENT",
        msg: "name: ksNode2, err: keyshare does not exist",
      });

      const body = buildKeygenBody();

      const response = await request(app)
        .post("/tss/v2/keygen")
        .send(body)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
    });
  });
});
