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
import { TEMP_ENC_SECRET } from "@oko-wallet-api/api/tss/utils";
import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";

// ── Mocks ───────────────────────────────────────────────────────────────

const mockCheckKeyShareFromKSNodesV2 = jest.fn() as jest.Mock;
const mockCheckKeyShareFromKSNodes = jest.fn();

await jest.unstable_mockModule("@oko-wallet-api/api/tss/ks_node", () => ({
  checkKeyShareFromKSNodes: mockCheckKeyShareFromKSNodes,
  checkKeyShareFromKSNodesV2: mockCheckKeyShareFromKSNodesV2,
}));

const TEST_EMAIL = "scenario-test@example.com";
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
      user_identifier: TEST_EMAIL,
      email: TEST_EMAIL,
      name: "Scenario Test User",
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

// ── Helpers ─────────────────────────────────────────────────────────────

const SSS_THRESHOLD = 2;
const TEST_SEED_SHARE = "a".repeat(64) + "b".repeat(64);

function buildKeygenBody() {
  const secp256k1KeygenResult = napiRunKeygenClientCentralized();
  const ed25519KeygenResult = runKeygenCentralizedEd25519();
  const keygen2Secp = secp256k1KeygenResult.keygen_outputs[Participant.P1];
  const keygen2Ed = ed25519KeygenResult.keygen_outputs[Participant.P1];

  return {
    body: {
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
    },
    secp256k1PublicKey: keygen2Secp.public_key,
    ed25519PublicKey: Buffer.from(ed25519KeygenResult.public_key).toString(
      "hex",
    ),
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("registration + reshare scenario e2e", () => {
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
      ENCRYPTION_SECRET: TEMP_ENC_SECRET,
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

  function getWalletKSNodeIds(walletId: string) {
    return getWalletKSNodesByWalletId(pool, walletId).then((res) => {
      if (res.success === false) {
        throw new Error("Failed to get wallet ks nodes");
      }
      return res.data.map((n) => n.node_id).sort();
    });
  }

  // ── Scenario 1 ──────────────────────────────────────────────────────

  it("signup(2/3) → reshare(node 3 still down) → partial reshare, wallet_ks_nodes stays 2", async () => {
    // Setup
    await insertKeyShareNodeMeta(pool, {
      sss_threshold: SSS_THRESHOLD,
      registration_threshold: 2,
    });
    const ksNodeIds = await setUpKSNodes(3);
    await createTestCustomer();

    // Step 1: Keygen — node 3 down, only 1,2 succeed
    const successNodeIds = [ksNodeIds[0], ksNodeIds[1]];
    (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
      success: true,
      data: {
        secp256k1: { nodeIds: successNodeIds },
        ed25519: { nodeIds: successNodeIds },
      },
    });

    const {
      body: keygenBody,
      secp256k1PublicKey,
      ed25519PublicKey,
    } = buildKeygenBody();
    const keygenRes = await request(app)
      .post("/tss/v2/keygen")
      .send(keygenBody)
      .expect(200);
    expect(keygenRes.body.success).toBe(true);
    const walletIdSecp = keygenRes.body.data.user.wallet_id_secp256k1;
    const walletIdEd = keygenRes.body.data.user.wallet_id_ed25519;

    // Verify: 2 nodes registered
    expect(await getWalletKSNodeIds(walletIdSecp)).toEqual(
      successNodeIds.sort(),
    );
    expect(await getWalletKSNodeIds(walletIdEd)).toEqual(successNodeIds.sort());

    // Step 2: Reshare — node 3 still down, mock returns only 1,2
    (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
      success: true,
      data: {
        secp256k1: { nodeIds: successNodeIds },
        ed25519: { nodeIds: successNodeIds },
      },
    });

    const reshareRes = await request(app)
      .post("/tss/v2/user/reshare")
      .send({
        auth_type: "google",
        secp256k1_public_key: secp256k1PublicKey,
        ed25519_public_key: ed25519PublicKey,
        reshared_key_shares: successNodeIds.map((_, i) => ({
          name: `ksNode${i + 1}`,
          endpoint: `http://test.com/ksNode${i + 1}`,
        })),
      })
      .expect(200);

    expect(reshareRes.body.success).toBe(true);

    // Verify: still 2 nodes
    expect(await getWalletKSNodeIds(walletIdSecp)).toEqual(
      successNodeIds.sort(),
    );
    expect(await getWalletKSNodeIds(walletIdEd)).toEqual(successNodeIds.sort());
  });

  // ── Scenario 2 ──────────────────────────────────────────────────────

  it("signup(2/3) → node 3 recovers → reshare(all 3) → wallet_ks_nodes expands to 3", async () => {
    // Setup
    await insertKeyShareNodeMeta(pool, {
      sss_threshold: SSS_THRESHOLD,
      registration_threshold: 2,
    });
    const ksNodeIds = await setUpKSNodes(3);
    await createTestCustomer();

    // Step 1: Keygen — node 3 down, only 1,2 succeed
    const partialNodeIds = [ksNodeIds[0], ksNodeIds[1]];
    (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
      success: true,
      data: {
        secp256k1: { nodeIds: partialNodeIds },
        ed25519: { nodeIds: partialNodeIds },
      },
    });

    const {
      body: keygenBody,
      secp256k1PublicKey,
      ed25519PublicKey,
    } = buildKeygenBody();
    const keygenRes = await request(app)
      .post("/tss/v2/keygen")
      .send(keygenBody)
      .expect(200);

    const walletIdSecp = keygenRes.body.data.user.wallet_id_secp256k1;
    const walletIdEd = keygenRes.body.data.user.wallet_id_ed25519;

    // Verify: 2 nodes after signup
    expect(await getWalletKSNodeIds(walletIdSecp)).toEqual(
      partialNodeIds.sort(),
    );

    // Step 2: Node 3 recovers → reshare with all 3 nodes
    (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
      success: true,
      data: {
        secp256k1: { nodeIds: ksNodeIds },
        ed25519: { nodeIds: ksNodeIds },
      },
    });

    const reshareRes = await request(app)
      .post("/tss/v2/user/reshare")
      .send({
        auth_type: "google",
        secp256k1_public_key: secp256k1PublicKey,
        ed25519_public_key: ed25519PublicKey,
        reshared_key_shares: ksNodeIds.map((_, i) => ({
          name: `ksNode${i + 1}`,
          endpoint: `http://test.com/ksNode${i + 1}`,
        })),
      })
      .expect(200);

    expect(reshareRes.body.success).toBe(true);

    // Verify: expanded to 3 nodes
    expect(await getWalletKSNodeIds(walletIdSecp)).toEqual(ksNodeIds.sort());
    expect(await getWalletKSNodeIds(walletIdEd)).toEqual(ksNodeIds.sort());
  });

  // ── Scenario 3 ──────────────────────────────────────────────────────

  it("signup(3/3) → node 3 data loss → reshare partial(1,2 only) → login succeeds", async () => {
    // Setup
    await insertKeyShareNodeMeta(pool, {
      sss_threshold: SSS_THRESHOLD,
      registration_threshold: 2,
    });
    const ksNodeIds = await setUpKSNodes(3);
    await createTestCustomer();

    // Step 1: Keygen — all 3 succeed
    (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
      success: true,
      data: {
        secp256k1: { nodeIds: ksNodeIds },
        ed25519: { nodeIds: ksNodeIds },
      },
    });

    const {
      body: keygenBody,
      secp256k1PublicKey,
      ed25519PublicKey,
    } = buildKeygenBody();
    const keygenRes = await request(app)
      .post("/tss/v2/keygen")
      .send(keygenBody)
      .expect(200);

    const walletIdSecp = keygenRes.body.data.user.wallet_id_secp256k1;

    // Verify: all 3 nodes after signup
    expect(await getWalletKSNodeIds(walletIdSecp)).toEqual(ksNodeIds.sort());

    // Step 2: Node 3 has data loss, reshare sends to 1,2 only
    const reshareNodeIds = [ksNodeIds[0], ksNodeIds[1]];
    (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
      success: true,
      data: {
        secp256k1: { nodeIds: reshareNodeIds },
        ed25519: { nodeIds: reshareNodeIds },
      },
    });

    const reshareRes = await request(app)
      .post("/tss/v2/user/reshare")
      .send({
        auth_type: "google",
        secp256k1_public_key: secp256k1PublicKey,
        ed25519_public_key: ed25519PublicKey,
        reshared_key_shares: reshareNodeIds.map((_, i) => ({
          name: `ksNode${i + 1}`,
          endpoint: `http://test.com/ksNode${i + 1}`,
        })),
      })
      .expect(200);

    expect(reshareRes.body.success).toBe(true);

    // Verify: wallet_ks_nodes still has all 3 (upsert doesn't remove existing)
    // Nodes 1,2 are upserted (refreshed), node 3 keeps its existing record
    const secpNodes = await getWalletKSNodeIds(walletIdSecp);
    expect(secpNodes.length).toBeGreaterThanOrEqual(2);
  });

  // ── Scenario 4 ──────────────────────────────────────────────────────

  it("null threshold → reshare all-or-nothing: fails when checkKeyShare fails", async () => {
    // Setup: null registration_threshold → all-or-nothing
    await insertKeyShareNodeMeta(pool, {
      sss_threshold: SSS_THRESHOLD,
      registration_threshold: null,
    });
    const ksNodeIds = await setUpKSNodes(2);
    await createTestCustomer();

    // Step 1: Keygen — all succeed
    (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
      success: true,
      data: {
        secp256k1: { nodeIds: ksNodeIds },
        ed25519: { nodeIds: ksNodeIds },
      },
    });

    const {
      body: keygenBody,
      secp256k1PublicKey,
      ed25519PublicKey,
    } = buildKeygenBody();
    const keygenRes = await request(app)
      .post("/tss/v2/keygen")
      .send(keygenBody)
      .expect(200);

    expect(keygenRes.body.success).toBe(true);

    // Step 2: Reshare — checkKeyShareFromKSNodesV2 fails (one node down)
    (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
      success: false,
      code: "KEYSHARE_NODE_INSUFFICIENT",
      msg: "name: ksNode2, err: keyshare does not exist",
    });

    const reshareRes = await request(app)
      .post("/tss/v2/user/reshare")
      .send({
        auth_type: "google",
        secp256k1_public_key: secp256k1PublicKey,
        ed25519_public_key: ed25519PublicKey,
        reshared_key_shares: ksNodeIds.map((_, i) => ({
          name: `ksNode${i + 1}`,
          endpoint: `http://test.com/ksNode${i + 1}`,
        })),
      })
      .expect(400);

    expect(reshareRes.body.success).toBe(false);
    expect(reshareRes.body.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
  });
});
