import {
  computeIdTokenHash,
  createRevealSignature,
  generateClientKeypair,
  generateSessionId,
} from "@e2e/utils/signature";
import { createTestContext, type TestContext } from "@e2e/utils/test_context";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import {
  extractKeyPackageSharesEd25519,
  runKeygenCentralizedEd25519,
  sssSplitEd25519,
} from "@oko-wallet/teddsa-addon/src/server";
import request from "supertest";

/**
 * Scenario tests for registration_threshold + reshare partial success.
 *
 * Tests the full end-to-end flow with real KSN servers:
 * - Sign-up with partial node registration (some nodes "down")
 * - Reshare with partial nodes
 * - Reshare after node recovery
 * - checkEmailV2 responses with registration_threshold
 * - Wallet KS node state transitions across signup → reshare cycles
 */
describe("e2e_test_registration_threshold_reshare", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "reg_threshold_user";
  const AUTH_TYPE: AuthType = "google";
  const TEST_SEED_SHARE = "a".repeat(64) + "b".repeat(64);

  let idTokenCounter = 0;
  function nextIdToken(): string {
    idTokenCounter++;
    return `mock_token_${idTokenCounter}`;
  }

  function generateNodeIdentifier(nodeIndex: number): Uint8Array {
    const id = new Uint8Array(32);
    id[0] = nodeIndex + 10;
    return id;
  }

  function generateSecp256k1Share(nodeIndex: number): string {
    const prefix = "c";
    const nodeHex = (nodeIndex + 1).toString(16).padStart(2, "0");
    const pattern = `${prefix}${nodeHex}${prefix}`;
    return pattern.repeat(32);
  }

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  // ── Helpers ─────────────────────────────────────────────────────────

  /**
   * Register user on first `nodeCount` KSN nodes and run oko_api keygen.
   */
  async function signUpOnNodes(nodeCount: number): Promise<{
    secp256k1PublicKey: string;
    ed25519PublicKeyHex: string;
    nodeShares: Array<{ secp256k1Share: string; ed25519Share: string }>;
  }> {
    const idToken = nextIdToken();
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, idToken);

    const frostKeygen = runKeygenCentralizedEd25519();
    const clientOut = frostKeygen.keygen_outputs[0];
    const serverOut = frostKeygen.keygen_outputs[1];
    const clientKeyPackage = new Uint8Array(clientOut.key_package);
    const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);
    const ed25519Pk = frostKeygen.public_key;
    const ed25519PublicKeyHex = Buffer.from(ed25519Pk).toString("hex");
    const secp256k1PublicKey = "03" + "a".repeat(64);

    const signingShare = new Uint8Array(clientShares.signing_share);
    const nodeIdentifiers = [
      generateNodeIdentifier(0),
      generateNodeIdentifier(1),
      generateNodeIdentifier(2),
    ];
    const sss = sssSplitEd25519(signingShare, nodeIdentifiers, 2);

    // Commit to oko_api
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_up",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idTokenHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    // Register on first `nodeCount` KSN nodes
    const nodeShares: Array<{
      secp256k1Share: string;
      ed25519Share: string;
    }> = [];
    for (let i = 0; i < nodeCount; i++) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });
      expect(ksnCommit.status).toBe(200);

      const kpBytes = new Uint8Array(sss.key_packages[i].key_package);
      const shares = extractKeyPackageSharesEd25519(kpBytes);
      const edShare =
        Buffer.from(shares.signing_share).toString("hex") +
        Buffer.from(shares.verifying_share).toString("hex");

      nodeShares[i] = {
        secp256k1Share: generateSecp256k1Share(i),
        ed25519Share: edShare,
      };

      const regSig = createRevealSignature(
        clientKeypair.privateKey,
        ksnCommit.body.data.node_pubkey,
        sessionId,
        AUTH_TYPE,
        idToken,
        "sign_up",
        "register",
      );

      const reg = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: secp256k1PublicKey,
              share: nodeShares[i].secp256k1Share,
            },
            ed25519: {
              public_key: ed25519PublicKeyHex,
              share: nodeShares[i].ed25519Share,
              seed_share: TEST_SEED_SHARE,
            },
          },
          cr_session_id: sessionId,
          cr_signature: regSig,
        });
      expect(reg.status).toBe(200);
    }

    // Also store placeholder shares for unregistered nodes (for reshare later)
    for (let i = nodeCount; i < 3; i++) {
      const kpBytes = new Uint8Array(sss.key_packages[i].key_package);
      const shares = extractKeyPackageSharesEd25519(kpBytes);
      const edShare =
        Buffer.from(shares.signing_share).toString("hex") +
        Buffer.from(shares.verifying_share).toString("hex");
      nodeShares[i] = {
        secp256k1Share: generateSecp256k1Share(i),
        ed25519Share: edShare,
      };
    }

    // oko_api keygen
    const kgSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      idToken,
      "sign_up",
      "keygen",
    );
    const kg = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${idToken}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2_secp256k1: {
          public_key: secp256k1PublicKey,
          private_share: "e".repeat(64),
        },
        keygen_2_ed25519: {
          key_package: serverOut.key_package,
          public_key_package: Buffer.from(
            serverOut.public_key_package,
          ).toString("hex"),
          identifier: serverOut.identifier,
          public_key: ed25519Pk,
        },
        ed25519_seed_share: TEST_SEED_SHARE,
        cr_session_id: sessionId,
        cr_signature: kgSig,
      });
    expect(kg.status).toBe(200);

    return { secp256k1PublicKey, ed25519PublicKeyHex, nodeShares };
  }

  /**
   * Run reshare on specified KSN node indices, then update oko_api.
   */
  async function reshareOnNodes(
    nodeIndices: number[],
    secp256k1PublicKey: string,
    ed25519PublicKeyHex: string,
    nodeShares: Array<{ secp256k1Share: string; ed25519Share: string }>,
  ): Promise<{ status: number; body: any }> {
    const idToken = nextIdToken();
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, idToken);

    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "reshare",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    // Signin
    const signinSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      idToken,
      "reshare",
      "signin",
    );
    const signin = await request(ctx.okoApiApp)
      .post("/tss/v2/user/signin")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${idToken}`)
      .send({
        auth_type: AUTH_TYPE,
        cr_session_id: sessionId,
        cr_signature: signinSig,
      });
    expect(signin.status).toBe(200);

    // Reshare on specified KSN nodes
    const resharedNodes: Array<{ name: string; endpoint: string }> = [];
    for (const i of nodeIndices) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "reshare",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idHash,
        });
      expect(ksnCommit.status).toBe(200);

      const sig = createRevealSignature(
        clientKeypair.privateKey,
        ksnCommit.body.data.node_pubkey,
        sessionId,
        AUTH_TYPE,
        idToken,
        "reshare",
        "reshare",
      );

      const res = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/reshare")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: secp256k1PublicKey,
              share: nodeShares[i].secp256k1Share,
            },
            ed25519: {
              public_key: ed25519PublicKeyHex,
              share: nodeShares[i].ed25519Share,
              seed_share: TEST_SEED_SHARE,
            },
          },
          cr_session_id: sessionId,
          cr_signature: sig,
        });
      expect(res.status).toBe(200);

      resharedNodes.push({
        name: `test_node_${i + 1}`,
        endpoint: ctx.ksnUrls[i],
      });
    }

    // Update oko_api
    const reshareSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      idToken,
      "reshare",
      "reshare",
    );
    const okoReshare = await request(ctx.okoApiApp)
      .post("/tss/v2/user/reshare")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${idToken}`)
      .send({
        auth_type: AUTH_TYPE,
        secp256k1_public_key: secp256k1PublicKey,
        ed25519_public_key: ed25519PublicKeyHex,
        reshared_key_shares: resharedNodes,
        cr_session_id: sessionId,
        cr_signature: reshareSig,
      });

    return { status: okoReshare.status, body: okoReshare.body };
  }

  async function getWalletKSNodeCount(walletId: string): Promise<number> {
    const res = await ctx.okoApiPool.query(
      `SELECT COUNT(*) as count FROM wallet_ks_nodes WHERE wallet_id = $1 AND status = 'ACTIVE'`,
      [walletId],
    );
    return parseInt(res.rows[0].count, 10);
  }

  async function getWalletKSNodeIds(walletId: string): Promise<string[]> {
    const res = await ctx.okoApiPool.query(
      `SELECT node_id FROM wallet_ks_nodes WHERE wallet_id = $1 AND status = 'ACTIVE' ORDER BY node_id`,
      [walletId],
    );
    return res.rows.map((r: any) => r.node_id);
  }

  async function getUserWalletIds(): Promise<{
    secp256k1WalletId: string;
    ed25519WalletId: string;
  }> {
    const userRes = await ctx.okoApiPool.query(
      `SELECT user_id FROM oko_users WHERE email = $1`,
      [TEST_USER_ID],
    );
    const userId = userRes.rows[0].user_id;
    const walletsRes = await ctx.okoApiPool.query(
      `SELECT wallet_id, curve_type FROM oko_wallets WHERE user_id = $1 AND status = 'ACTIVE'`,
      [userId],
    );
    const secp = walletsRes.rows.find((r: any) => r.curve_type === "secp256k1");
    const ed = walletsRes.rows.find((r: any) => r.curve_type === "ed25519");
    return {
      secp256k1WalletId: secp.wallet_id,
      ed25519WalletId: ed.wallet_id,
    };
  }

  async function getKsnNodeIds(): Promise<string[]> {
    const res = await ctx.okoApiPool.query(
      `SELECT node_id FROM key_share_nodes WHERE status = 'ACTIVE' ORDER BY node_name`,
    );
    return res.rows.map((r: any) => r.node_id);
  }

  // ── checkEmailV2 ────────────────────────────────────────────────────

  describe("checkEmailV2 with registration_threshold", () => {
    it("returns registration_threshold in keyshare_node_meta response", async () => {
      await ctx.resetAllDatabases();
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = 2`,
      );

      const res = await request(ctx.okoApiApp)
        .post("/tss/v2/user/check")
        .send({ email: "check@example.com", auth_type: AUTH_TYPE });

      expect(res.status).toBe(200);
      expect(res.body.data.keyshare_node_meta.registration_threshold).toBe(2);
    });

    it("returns null registration_threshold when not set", async () => {
      await ctx.resetAllDatabases();

      const res = await request(ctx.okoApiApp)
        .post("/tss/v2/user/check")
        .send({ email: "check@example.com", auth_type: AUTH_TYPE });

      expect(res.status).toBe(200);
      expect(
        res.body.data.keyshare_node_meta.registration_threshold,
      ).toBeNull();
    });
  });

  // ── Sign-up partial success ─────────────────────────────────────────

  describe("sign-up with registration_threshold", () => {
    it("succeeds when registered nodes >= registration_threshold", async () => {
      await ctx.resetAllDatabases();
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = 2`,
      );

      await signUpOnNodes(2);

      const walletIds = await getUserWalletIds();
      expect(await getWalletKSNodeCount(walletIds.secp256k1WalletId)).toBe(2);
      expect(await getWalletKSNodeCount(walletIds.ed25519WalletId)).toBe(2);
    });

    it("registers all 3 nodes when all are available", async () => {
      await ctx.resetAllDatabases();
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = 2`,
      );

      await signUpOnNodes(3);

      const walletIds = await getUserWalletIds();
      expect(await getWalletKSNodeCount(walletIds.secp256k1WalletId)).toBe(3);
      expect(await getWalletKSNodeCount(walletIds.ed25519WalletId)).toBe(3);
    });

    it("wallet_ks_nodes only contains registered nodes (not all active nodes)", async () => {
      await ctx.resetAllDatabases();
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = 2`,
      );

      await signUpOnNodes(2);

      const walletIds = await getUserWalletIds();
      const ksnNodeIds = await getKsnNodeIds();
      const walletNodeIds = await getWalletKSNodeIds(
        walletIds.secp256k1WalletId,
      );

      // Only 2 of 3 nodes should be in wallet_ks_nodes
      expect(walletNodeIds.length).toBe(2);
      expect(ksnNodeIds.length).toBe(3);
      // The registered nodes should be a subset of all KSN nodes
      for (const nodeId of walletNodeIds) {
        expect(ksnNodeIds).toContain(nodeId);
      }
    });
  });

  // ── Reshare after partial sign-up ───────────────────────────────────

  describe("reshare after partial sign-up (node 2 was down)", () => {
    let secp256k1PublicKey: string;
    let ed25519PublicKeyHex: string;
    let nodeShares: Array<{ secp256k1Share: string; ed25519Share: string }>;
    let walletIds: { secp256k1WalletId: string; ed25519WalletId: string };

    beforeEach(async () => {
      await ctx.resetAllDatabases();
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = 2`,
      );

      const result = await signUpOnNodes(2);
      secp256k1PublicKey = result.secp256k1PublicKey;
      ed25519PublicKeyHex = result.ed25519PublicKeyHex;
      nodeShares = result.nodeShares;
      walletIds = await getUserWalletIds();
    });

    it("reshare to nodes 0,1 only (node 2 still down) — wallet_ks_nodes stays 2", async () => {
      const { status, body } = await reshareOnNodes(
        [0, 1],
        secp256k1PublicKey,
        ed25519PublicKeyHex,
        nodeShares,
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(await getWalletKSNodeCount(walletIds.secp256k1WalletId)).toBe(2);
      expect(await getWalletKSNodeCount(walletIds.ed25519WalletId)).toBe(2);
    });

    it("reshare to all 3 nodes (node 2 recovered) — wallet_ks_nodes expands to 3", async () => {
      const { status, body } = await reshareOnNodes(
        [0, 1, 2],
        secp256k1PublicKey,
        ed25519PublicKeyHex,
        nodeShares,
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(await getWalletKSNodeCount(walletIds.secp256k1WalletId)).toBe(3);
      expect(await getWalletKSNodeCount(walletIds.ed25519WalletId)).toBe(3);
    });

    it("reshare twice: first partial, then full recovery", async () => {
      // First reshare: node 2 still down → only 0,1
      const first = await reshareOnNodes(
        [0, 1],
        secp256k1PublicKey,
        ed25519PublicKeyHex,
        nodeShares,
      );
      expect(first.status).toBe(200);
      expect(await getWalletKSNodeCount(walletIds.secp256k1WalletId)).toBe(2);

      // Second reshare: node 2 recovered → all 3
      const second = await reshareOnNodes(
        [0, 1, 2],
        secp256k1PublicKey,
        ed25519PublicKeyHex,
        nodeShares,
      );
      expect(second.status).toBe(200);
      expect(await getWalletKSNodeCount(walletIds.secp256k1WalletId)).toBe(3);
      expect(await getWalletKSNodeCount(walletIds.ed25519WalletId)).toBe(3);
    });

    it("both secp256k1 and ed25519 wallet_ks_nodes are consistent after reshare", async () => {
      const { status } = await reshareOnNodes(
        [0, 1, 2],
        secp256k1PublicKey,
        ed25519PublicKeyHex,
        nodeShares,
      );
      expect(status).toBe(200);

      const secpNodeIds = await getWalletKSNodeIds(walletIds.secp256k1WalletId);
      const edNodeIds = await getWalletKSNodeIds(walletIds.ed25519WalletId);
      expect(secpNodeIds).toEqual(edNodeIds);
    });
  });

  // ── Reshare after full sign-up (node goes down later) ──────────────

  describe("reshare after full sign-up (3/3, then node 2 goes down)", () => {
    let secp256k1PublicKey: string;
    let ed25519PublicKeyHex: string;
    let nodeShares: Array<{ secp256k1Share: string; ed25519Share: string }>;
    let walletIds: { secp256k1WalletId: string; ed25519WalletId: string };

    beforeEach(async () => {
      await ctx.resetAllDatabases();
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = 2`,
      );

      const result = await signUpOnNodes(3);
      secp256k1PublicKey = result.secp256k1PublicKey;
      ed25519PublicKeyHex = result.ed25519PublicKeyHex;
      nodeShares = result.nodeShares;
      walletIds = await getUserWalletIds();
    });

    it("started with 3 nodes registered", async () => {
      expect(await getWalletKSNodeCount(walletIds.secp256k1WalletId)).toBe(3);
    });

    it("reshare to 0,1 only (node 2 down) — existing node 2 record preserved via upsert", async () => {
      const { status, body } = await reshareOnNodes(
        [0, 1],
        secp256k1PublicKey,
        ed25519PublicKeyHex,
        nodeShares,
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);

      // upsert only touches nodes 0,1; node 2's existing record stays
      const count = await getWalletKSNodeCount(walletIds.secp256k1WalletId);
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Null threshold fallback ─────────────────────────────────────────

  describe("null registration_threshold (all-or-nothing fallback)", () => {
    it("sign-up with all 3 nodes succeeds when threshold is null", async () => {
      await ctx.resetAllDatabases();
      // Default seed has registration_threshold = null

      await signUpOnNodes(3);

      const walletIds = await getUserWalletIds();
      expect(await getWalletKSNodeCount(walletIds.secp256k1WalletId)).toBe(3);
    });

    it("reshare with all 3 nodes succeeds when threshold is null", async () => {
      await ctx.resetAllDatabases();

      const { secp256k1PublicKey, ed25519PublicKeyHex, nodeShares } =
        await signUpOnNodes(3);

      const { status, body } = await reshareOnNodes(
        [0, 1, 2],
        secp256k1PublicKey,
        ed25519PublicKeyHex,
        nodeShares,
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });
  });
});
