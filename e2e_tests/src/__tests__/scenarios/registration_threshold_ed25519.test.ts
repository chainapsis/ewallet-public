import {
  computeIdTokenHash,
  createRevealSignature,
  generateClientKeypair,
  generateSessionId,
} from "@e2e/utils/signature";
import { createTestContext, type TestContext } from "@e2e/utils/test_context";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import { runKeygenCentralizedEd25519 } from "@oko-wallet/teddsa-addon/src/server";
import request from "supertest";

/**
 * Scenario tests for registration_threshold applied to ed25519 keygen flows
 * and pendingCommits resolve behavior.
 *
 * Tests:
 * - add_ed25519 with partial node success
 * - sign_up where all nodes alive but threshold < nodes.length (pendingCommits)
 * - reshare where all nodes alive (pendingCommits)
 * - null threshold fallback
 */
describe("e2e_test_registration_threshold_ed25519_and_pending", () => {
  let ctx: TestContext;

  const AUTH_TYPE: AuthType = "google";
  const TEST_SEED_SHARE = "a".repeat(64) + "b".repeat(64);

  let idTokenCounter = 0;
  function nextIdToken(): string {
    idTokenCounter++;
    return `mock_token_ed25519_${idTokenCounter}`;
  }

  function nextUserId(): string {
    idTokenCounter++;
    return `ed25519_user_${idTokenCounter}`;
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
   * Create a secp256k1-only user via v1 keygen (registers on all KSN nodes).
   */
  async function prepareSecpOnlyUser(userId: string): Promise<{
    secp256k1PublicKey: string;
  }> {
    const idToken = nextIdToken();
    const secp256k1PublicKey = "03" + "a".repeat(64);

    // Register secp256k1 to all KSN via v1
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const reg = await request(ctx.ksnApps[i])
        .post("/keyshare/v1/register")
        .set("x-mock-user-id", userId)
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          auth_type: AUTH_TYPE,
          curve_type: "secp256k1",
          public_key: secp256k1PublicKey,
          share: generateSecp256k1Share(i),
        });
      expect(reg.status).toBe(200);
    }

    // v1 keygen on oko_api
    const kg = await request(ctx.okoApiApp)
      .post("/tss/v1/keygen")
      .set("x-mock-user-id", userId)
      .set("Authorization", `Bearer ${idToken}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2: {
          public_key: secp256k1PublicKey,
          private_share: "e".repeat(64),
        },
      });
    expect(kg.status).toBe(200);

    return { secp256k1PublicKey };
  }

  /**
   * Register ed25519 on specified KSN node indices and call keygen_ed25519.
   */
  async function addEd25519OnNodes(
    userId: string,
    nodeIndices: number[],
  ): Promise<{ status: number; body: any }> {
    const idToken = nextIdToken();
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, idToken);

    const edKeygen = runKeygenCentralizedEd25519();
    const edKeygen2 = edKeygen.keygen_outputs[1];
    const edPkHex = Buffer.from(edKeygen.public_key).toString("hex");

    // Commit to oko_api
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "add_ed25519",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    // Commit + register ed25519 on specified nodes
    for (const i of nodeIndices) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "add_ed25519",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idHash,
        });
      expect(ksnCommit.status).toBe(200);

      const regSig = createRevealSignature(
        clientKeypair.privateKey,
        ksnCommit.body.data.node_pubkey,
        sessionId,
        AUTH_TYPE,
        idToken,
        "add_ed25519",
        "register_ed25519",
      );

      const reg = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register/ed25519")
        .set("x-mock-user-id", userId)
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          auth_type: AUTH_TYPE,
          public_key: edPkHex,
          share: (i === 0 ? "aa" : i === 1 ? "bb" : "cc").repeat(64),
          seed_share: TEST_SEED_SHARE,
          cr_session_id: sessionId,
          cr_signature: regSig,
        });
      expect(reg.status).toBe(200);
    }

    // keygen_ed25519 on oko_api
    const kgSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      idToken,
      "add_ed25519",
      "keygen_ed25519",
    );
    const keygen = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen_ed25519")
      .set("x-mock-user-id", userId)
      .set("Authorization", `Bearer ${idToken}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2: {
          key_package: edKeygen2.key_package,
          public_key_package: Buffer.from(
            edKeygen2.public_key_package,
          ).toString("hex"),
          identifier: edKeygen2.identifier,
          public_key: edKeygen.public_key,
          seed_share: TEST_SEED_SHARE,
        },
        cr_session_id: sessionId,
        cr_signature: kgSig,
      });

    return { status: keygen.status, body: keygen.body };
  }

  async function getWalletKSNodeCount(walletId: string): Promise<number> {
    const res = await ctx.okoApiPool.query(
      `SELECT COUNT(*) as count FROM wallet_ks_nodes WHERE wallet_id = $1 AND status = 'ACTIVE'`,
      [walletId],
    );
    return parseInt(res.rows[0].count, 10);
  }

  async function getUserEd25519WalletId(
    userId: string,
  ): Promise<string | null> {
    const userRes = await ctx.okoApiPool.query(
      `SELECT user_id FROM oko_users WHERE email = $1`,
      [userId],
    );
    if (userRes.rows.length === 0) {
      return null;
    }
    const walletsRes = await ctx.okoApiPool.query(
      `SELECT wallet_id FROM oko_wallets WHERE user_id = $1 AND curve_type = 'ed25519' AND status = 'ACTIVE'`,
      [userRes.rows[0].user_id],
    );
    return walletsRes.rows[0]?.wallet_id ?? null;
  }

  // ── Ed25519 keygen with registration_threshold ──────────────────────

  describe("add_ed25519 with registration_threshold", () => {
    it("ed25519 keygen succeeds with 2/3 nodes (threshold=2)", async () => {
      await ctx.resetAllDatabases();
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = 2`,
      );

      const userId = nextUserId();
      await prepareSecpOnlyUser(userId);

      // Register ed25519 on nodes 0,1 only (node 2 "down")
      const { status, body } = await addEd25519OnNodes(userId, [0, 1]);

      expect(status).toBe(200);
      expect(body.success).toBe(true);

      // Verify ed25519 wallet created with 2 nodes
      const ed25519WalletId = await getUserEd25519WalletId(userId);
      expect(ed25519WalletId).not.toBeNull();
      expect(await getWalletKSNodeCount(ed25519WalletId!)).toBe(2);
    });

    it("ed25519 keygen on all 3 nodes when all available", async () => {
      await ctx.resetAllDatabases();
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = 2`,
      );

      const userId = nextUserId();
      await prepareSecpOnlyUser(userId);

      const { status, body } = await addEd25519OnNodes(userId, [0, 1, 2]);

      expect(status).toBe(200);
      expect(body.success).toBe(true);

      const ed25519WalletId = await getUserEd25519WalletId(userId);
      expect(ed25519WalletId).not.toBeNull();
      expect(await getWalletKSNodeCount(ed25519WalletId!)).toBe(3);
    });
  });

  // ── Ed25519 keygen → reshare recovery ───────────────────────────────

  describe("add_ed25519 partial → reshare recovery", () => {
    it("ed25519 on 2/3 → reshare to all 3 → wallet_ks_nodes expanded", async () => {
      await ctx.resetAllDatabases();
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = 2`,
      );

      const userId = nextUserId();
      const { secp256k1PublicKey } = await prepareSecpOnlyUser(userId);

      // Step 1: ed25519 keygen on 2/3 nodes
      const { status: edStatus } = await addEd25519OnNodes(userId, [0, 1]);
      expect(edStatus).toBe(200);

      const ed25519WalletId = await getUserEd25519WalletId(userId);
      expect(ed25519WalletId).not.toBeNull();
      expect(await getWalletKSNodeCount(ed25519WalletId!)).toBe(2);

      // Step 2: Get ed25519 public key from DB
      const walletRes = await ctx.okoApiPool.query(
        `SELECT encode(public_key, 'hex') as pk_hex FROM oko_wallets WHERE wallet_id = $1`,
        [ed25519WalletId],
      );
      const ed25519PublicKeyHex = walletRes.rows[0].pk_hex;

      // Step 3: Reshare to all 3 nodes (node 2 recovered)
      const reshareIdToken = nextIdToken();
      const reshareKeypair = generateClientKeypair();
      const reshareSessionId = generateSessionId();
      const reshareIdHash = computeIdTokenHash(AUTH_TYPE, reshareIdToken);

      const okoCommit = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: reshareSessionId,
          operation_type: "reshare",
          client_ephemeral_pubkey: reshareKeypair.publicKey.toHex(),
          id_token_hash: reshareIdHash,
        });
      expect(okoCommit.status).toBe(200);
      const okoNodePk = okoCommit.body.data.node_pubkey;

      // Signin
      const signinSig = createRevealSignature(
        reshareKeypair.privateKey,
        okoNodePk,
        reshareSessionId,
        AUTH_TYPE,
        reshareIdToken,
        "reshare",
        "signin",
      );
      const signin = await request(ctx.okoApiApp)
        .post("/tss/v2/user/signin")
        .set("x-mock-user-id", userId)
        .set("Authorization", `Bearer ${reshareIdToken}`)
        .send({
          auth_type: AUTH_TYPE,
          cr_session_id: reshareSessionId,
          cr_signature: signinSig,
        });
      expect(signin.status).toBe(200);

      // Reshare on all 3 KSN nodes
      const resharedNodes: Array<{ name: string; endpoint: string }> = [];
      for (let i = 0; i < ctx.ksnApps.length; i++) {
        const ksnCommit = await request(ctx.ksnApps[i])
          .post("/keyshare/v2/commit")
          .send({
            session_id: reshareSessionId,
            operation_type: "reshare",
            client_ephemeral_pubkey: reshareKeypair.publicKey.toHex(),
            id_token_hash: reshareIdHash,
          });
        expect(ksnCommit.status).toBe(200);

        const sig = createRevealSignature(
          reshareKeypair.privateKey,
          ksnCommit.body.data.node_pubkey,
          reshareSessionId,
          AUTH_TYPE,
          reshareIdToken,
          "reshare",
          "reshare",
        );

        const res = await request(ctx.ksnApps[i])
          .post("/keyshare/v2/reshare")
          .set("x-mock-user-id", userId)
          .set("Authorization", `Bearer ${reshareIdToken}`)
          .send({
            auth_type: AUTH_TYPE,
            wallets: {
              secp256k1: {
                public_key: secp256k1PublicKey,
                share: generateSecp256k1Share(i),
              },
              ed25519: {
                public_key: ed25519PublicKeyHex,
                share: (i === 0 ? "aa" : i === 1 ? "bb" : "cc").repeat(64),
                seed_share: TEST_SEED_SHARE,
              },
            },
            cr_session_id: reshareSessionId,
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
        reshareKeypair.privateKey,
        okoNodePk,
        reshareSessionId,
        AUTH_TYPE,
        reshareIdToken,
        "reshare",
        "reshare",
      );
      const okoReshare = await request(ctx.okoApiApp)
        .post("/tss/v2/user/reshare")
        .set("x-mock-user-id", userId)
        .set("Authorization", `Bearer ${reshareIdToken}`)
        .send({
          auth_type: AUTH_TYPE,
          secp256k1_public_key: secp256k1PublicKey,
          ed25519_public_key: ed25519PublicKeyHex,
          reshared_key_shares: resharedNodes,
          cr_session_id: reshareSessionId,
          cr_signature: reshareSig,
        });
      expect(okoReshare.status).toBe(200);

      // Verify: ed25519 wallet now has 3 nodes
      expect(await getWalletKSNodeCount(ed25519WalletId!)).toBe(3);
    });
  });

  // ── PendingCommits: all nodes alive, threshold < nodes.length ──────

  describe("pendingCommits resolve (all nodes alive)", () => {
    it("sign_up with threshold=2 registers all 3 nodes when all alive", async () => {
      await ctx.resetAllDatabases();
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = 2`,
      );

      const userId = nextUserId();
      const idToken = nextIdToken();

      // Full v2 sign_up flow
      const edKeygen = runKeygenCentralizedEd25519();
      const edKeygen2 = edKeygen.keygen_outputs[1];
      const secp256k1PublicKey = "03" + "b".repeat(64);
      const ed25519PublicKeyHex = Buffer.from(edKeygen.public_key).toString(
        "hex",
      );

      const clientKeypair = generateClientKeypair();
      const sessionId = generateSessionId();
      const idHash = computeIdTokenHash(AUTH_TYPE, idToken);

      // Commit oko_api
      const okoCommit = await request(ctx.okoApiApp)
        .post("/tss/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idHash,
        });
      expect(okoCommit.status).toBe(200);
      const okoNodePk = okoCommit.body.data.node_pubkey;

      // Commit + register on ALL 3 KSN nodes
      for (let i = 0; i < ctx.ksnApps.length; i++) {
        const ksnCommit = await request(ctx.ksnApps[i])
          .post("/keyshare/v2/commit")
          .send({
            session_id: sessionId,
            operation_type: "sign_up",
            client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
            id_token_hash: idHash,
          });
        expect(ksnCommit.status).toBe(200);

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
          .set("x-mock-user-id", userId)
          .set("Authorization", `Bearer ${idToken}`)
          .send({
            auth_type: AUTH_TYPE,
            wallets: {
              secp256k1: {
                public_key: secp256k1PublicKey,
                share: generateSecp256k1Share(i),
              },
              ed25519: {
                public_key: ed25519PublicKeyHex,
                share: (i === 0 ? "aa" : i === 1 ? "bb" : "cc").repeat(64),
                seed_share: TEST_SEED_SHARE,
              },
            },
            cr_session_id: sessionId,
            cr_signature: regSig,
          });
        expect(reg.status).toBe(200);
      }

      // Keygen on oko_api
      const kgSig = createRevealSignature(
        clientKeypair.privateKey,
        okoNodePk,
        sessionId,
        AUTH_TYPE,
        idToken,
        "sign_up",
        "keygen",
      );
      const keygen = await request(ctx.okoApiApp)
        .post("/tss/v2/keygen")
        .set("x-mock-user-id", userId)
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          auth_type: AUTH_TYPE,
          keygen_2_secp256k1: {
            public_key: secp256k1PublicKey,
            private_share: "e".repeat(64),
          },
          keygen_2_ed25519: {
            key_package: edKeygen2.key_package,
            public_key_package: Buffer.from(
              edKeygen2.public_key_package,
            ).toString("hex"),
            identifier: edKeygen2.identifier,
            public_key: edKeygen.public_key,
          },
          ed25519_seed_share: TEST_SEED_SHARE,
          cr_session_id: sessionId,
          cr_signature: kgSig,
        });
      expect(keygen.status).toBe(200);
      expect(keygen.body.success).toBe(true);

      // Verify: ALL 3 nodes registered (not just threshold=2)
      const userRes = await ctx.okoApiPool.query(
        `SELECT user_id FROM oko_users WHERE email = $1`,
        [userId],
      );
      const walletsRes = await ctx.okoApiPool.query(
        `SELECT wallet_id, curve_type FROM oko_wallets WHERE user_id = $1 AND status = 'ACTIVE'`,
        [userRes.rows[0].user_id],
      );
      for (const wallet of walletsRes.rows) {
        const count = await getWalletKSNodeCount(wallet.wallet_id);
        expect(count).toBe(3);
      }
    });
  });

  // ── Null threshold fallback ─────────────────────────────────────────

  describe("null registration_threshold (all-or-nothing)", () => {
    it("ed25519 keygen with all 3 nodes succeeds when threshold is null", async () => {
      await ctx.resetAllDatabases();
      // Default: registration_threshold = null

      const userId = nextUserId();
      await prepareSecpOnlyUser(userId);

      const { status, body } = await addEd25519OnNodes(userId, [0, 1, 2]);

      expect(status).toBe(200);
      expect(body.success).toBe(true);

      const ed25519WalletId = await getUserEd25519WalletId(userId);
      expect(ed25519WalletId).not.toBeNull();
      expect(await getWalletKSNodeCount(ed25519WalletId!)).toBe(3);
    });
  });
});
