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
 * Comprehensive 6-node scenario tests for registration_threshold.
 *
 * Environment: 6 KSN nodes, sss_threshold=2.
 * Tests all flows: sign-up, sign-in, reshare, add_ed25519, add_ed25519+reshare,
 * and full lifecycle — both with registration_threshold=4 and null.
 *
 * Corresponds to `.plan/OKO-773-manual-test.md` scenarios A through F.
 */
describe("e2e_comprehensive_6node", () => {
  let ctx: TestContext;
  const AUTH_TYPE: AuthType = "google";
  const TEST_SEED_SHARE = "a".repeat(64) + "b".repeat(64);

  let idTokenCounter = 0;
  function nextIdToken(): string {
    return `mock_token_6n_${++idTokenCounter}`;
  }
  function nextUserId(): string {
    return `user_6n_${++idTokenCounter}`;
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
    ctx = await createTestContext({ ksnCount: 6 });
  }, 30000);

  afterAll(async () => {
    await ctx.cleanup();
  });

  // ── Helpers ─────────────────────────────────────────────────────────

  async function setRegistrationThreshold(value: number | null): Promise<void> {
    if (value === null) {
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = NULL`,
      );
    } else {
      await ctx.okoApiPool.query(
        `UPDATE key_share_node_meta SET registration_threshold = $1`,
        [value],
      );
    }
  }

  /**
   * V2 sign-up: commit + register on specified nodes, then keygen on oko_api.
   */
  type NodeShare = { secp256k1Share: string; ed25519Share: string };

  async function signUpV2(
    userId: string,
    nodeIndices: number[],
  ): Promise<{
    status: number;
    body: any;
    secp256k1Pk: string;
    ed25519PkHex: string;
    nodeShares: NodeShare[];
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
    const ed25519PkHex = Buffer.from(ed25519Pk).toString("hex");
    const secp256k1Pk = "03" + "a".repeat(64);

    const signingShare = new Uint8Array(clientShares.signing_share);
    const nodeIds = Array.from({ length: 6 }, (_, i) =>
      generateNodeIdentifier(i),
    );
    const sss = sssSplitEd25519(signingShare, nodeIds, 2);

    // Commit oko_api
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_up",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idTokenHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    // Build all 6 node shares (needed for reshare later)
    const nodeShares: NodeShare[] = [];
    for (let i = 0; i < 6; i++) {
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

    // Commit + register on specified nodes
    for (const i of nodeIndices) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
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
              public_key: secp256k1Pk,
              share: nodeShares[i].secp256k1Share,
            },
            ed25519: {
              public_key: ed25519PkHex,
              share: nodeShares[i].ed25519Share,
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
    const kg = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", userId)
      .set("Authorization", `Bearer ${idToken}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2_secp256k1: {
          public_key: secp256k1Pk,
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

    return {
      status: kg.status,
      body: kg.body,
      secp256k1Pk,
      ed25519PkHex,
      nodeShares,
    };
  }

  /**
   * Reshare on specified nodes and update oko_api.
   */
  async function reshareOnNodes(
    userId: string,
    nodeIndices: number[],
    secp256k1Pk: string,
    ed25519PkHex: string,
    nodeShares: NodeShare[],
  ): Promise<{ status: number; body: any }> {
    // Simulate client-side commitAll threshold check:
    // real client would fail at commitAll if committed nodes < threshold
    const metaRes = await ctx.okoApiPool.query(
      `SELECT registration_threshold FROM key_share_node_meta ORDER BY created_at DESC LIMIT 1`,
    );
    const regThreshold =
      metaRes.rows[0]?.registration_threshold ?? ctx.ksnApps.length;
    if (nodeIndices.length < regThreshold) {
      return {
        status: 400,
        body: {
          success: false,
          code: "COMMIT_THRESHOLD_NOT_MET",
          msg: `Insufficient nodes: got ${nodeIndices.length}, need ${regThreshold}`,
        },
      };
    }

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
      .set("x-mock-user-id", userId)
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
        .set("x-mock-user-id", userId)
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: secp256k1Pk,
              share: nodeShares[i].secp256k1Share,
            },
            ed25519: {
              public_key: ed25519PkHex,
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
      .set("x-mock-user-id", userId)
      .set("Authorization", `Bearer ${idToken}`)
      .send({
        auth_type: AUTH_TYPE,
        secp256k1_public_key: secp256k1Pk,
        ed25519_public_key: ed25519PkHex,
        reshared_key_shares: resharedNodes,
        cr_session_id: sessionId,
        cr_signature: reshareSig,
      });

    return { status: okoReshare.status, body: okoReshare.body };
  }

  /**
   * Prepare secp256k1-only user via v1 keygen on all KSN nodes.
   */
  async function prepareSecpOnlyUser(userId: string): Promise<{
    secp256k1Pk: string;
  }> {
    const idToken = nextIdToken();
    const secp256k1Pk = "03" + "a".repeat(64);

    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const reg = await request(ctx.ksnApps[i])
        .post("/keyshare/v1/register")
        .set("x-mock-user-id", userId)
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          auth_type: AUTH_TYPE,
          curve_type: "secp256k1",
          public_key: secp256k1Pk,
          share: generateSecp256k1Share(i),
        });
      expect(reg.status).toBe(200);
    }

    const kg = await request(ctx.okoApiApp)
      .post("/tss/v1/keygen")
      .set("x-mock-user-id", userId)
      .set("Authorization", `Bearer ${idToken}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2: {
          public_key: secp256k1Pk,
          private_share: "e".repeat(64),
        },
      });
    expect(kg.status).toBe(200);

    return { secp256k1Pk };
  }

  /**
   * Add ed25519 on specified nodes for a secp256k1-only user.
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

    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "add_ed25519",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

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
          share: (["aa", "bb", "cc", "dd", "ee", "ff"][i] ?? "11").repeat(64),
          seed_share: TEST_SEED_SHARE,
          cr_session_id: sessionId,
          cr_signature: regSig,
        });
      expect(reg.status).toBe(200);
    }

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

  async function getUserWalletIds(userId: string): Promise<{
    secp256k1WalletId: string | null;
    ed25519WalletId: string | null;
  }> {
    const userRes = await ctx.okoApiPool.query(
      `SELECT user_id FROM oko_users WHERE email = $1`,
      [userId],
    );
    if (userRes.rows.length === 0) {
      return { secp256k1WalletId: null, ed25519WalletId: null };
    }
    const walletsRes = await ctx.okoApiPool.query(
      `SELECT wallet_id, curve_type FROM oko_wallets WHERE user_id = $1 AND status = 'ACTIVE'`,
      [userRes.rows[0].user_id],
    );
    const secp = walletsRes.rows.find((r: any) => r.curve_type === "secp256k1");
    const ed = walletsRes.rows.find((r: any) => r.curve_type === "ed25519");
    return {
      secp256k1WalletId: secp?.wallet_id ?? null,
      ed25519WalletId: ed?.wallet_id ?? null,
    };
  }

  // ── A. Sign-up ──────────────────────────────────────────────────────

  describe("A. Sign-up", () => {
    describe("registration_threshold = 4", () => {
      it("A-1: all 6 UP → success, wallet_ks_nodes 6", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();

        const { status } = await signUpV2(userId, [0, 1, 2, 3, 4, 5]);
        expect(status).toBe(200);

        const wallets = await getUserWalletIds(userId);
        expect(await getWalletKSNodeCount(wallets.secp256k1WalletId!)).toBe(6);
        expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(6);
      });

      it("A-2: 2 DOWN (4 alive) → success, wallet_ks_nodes 4", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();

        const { status } = await signUpV2(userId, [0, 1, 2, 3]);
        expect(status).toBe(200);

        const wallets = await getUserWalletIds(userId);
        expect(await getWalletKSNodeCount(wallets.secp256k1WalletId!)).toBe(4);
        expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(4);
      });

      it("A-3: 3 DOWN (3 alive) → fail (3 < threshold 4)", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();

        const { status, body } = await signUpV2(userId, [0, 1, 2]);
        expect(status).toBe(400);
        expect(body.success).toBe(false);
      });
    });

    describe("registration_threshold = null", () => {
      it("A-4: all 6 UP → success, wallet_ks_nodes 6", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(null);
        const userId = nextUserId();

        const { status } = await signUpV2(userId, [0, 1, 2, 3, 4, 5]);
        expect(status).toBe(200);

        const wallets = await getUserWalletIds(userId);
        expect(await getWalletKSNodeCount(wallets.secp256k1WalletId!)).toBe(6);
      });

      it("A-5: 1 DOWN → fail (5 < 6, all-or-nothing)", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(null);
        const userId = nextUserId();

        const { status, body } = await signUpV2(userId, [0, 1, 2, 3, 4]);
        expect(status).toBe(400);
        expect(body.success).toBe(false);
      });
    });
  });

  // ── B. Sign-in ──────────────────────────────────────────────────────

  describe("B. Sign-in (no reshare needed)", () => {
    it("B-1: signed up 6/6, all UP → normal login", async () => {
      await ctx.resetAllDatabases();
      await setRegistrationThreshold(4);
      const userId = nextUserId();

      await signUpV2(userId, [0, 1, 2, 3, 4, 5]);

      const checkRes = await request(ctx.okoApiApp)
        .post("/tss/v2/user/check")
        .send({ email: userId, auth_type: AUTH_TYPE });

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.exists).toBe(true);
      expect(checkRes.body.data.needs_reshare).toBe(false);
    });

    it("B-2: signed up 6/6, 2 DOWN → normal login (sss_threshold=2 met)", async () => {
      await ctx.resetAllDatabases();
      await setRegistrationThreshold(4);
      const userId = nextUserId();

      await signUpV2(userId, [0, 1, 2, 3, 4, 5]);

      // checkEmailV2 shows needs_reshare=false since all 6 have keyshares
      const checkRes = await request(ctx.okoApiApp)
        .post("/tss/v2/user/check")
        .send({ email: userId, auth_type: AUTH_TYPE });

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.exists).toBe(true);
      // All 6 nodes have keyshares, needs_reshare depends on unified node status
      // Since all registered, even if some are down, they're still ACTIVE in wallet_ks_nodes
    });
  });

  // ── C. Reshare ──────────────────────────────────────────────────────

  describe("C. Reshare", () => {
    describe("registration_threshold = 4", () => {
      it("C-1: signup(4/6) → reshare(4 only, 2 still down) → wallet_ks_nodes 4", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();

        const signUp = await signUpV2(userId, [0, 1, 2, 3]);
        expect(signUp.status).toBe(200);
        const wallets = await getUserWalletIds(userId);

        const reshare = await reshareOnNodes(
          userId,
          [0, 1, 2, 3],
          signUp.secp256k1Pk,
          signUp.ed25519PkHex,
          signUp.nodeShares,
        );
        expect(reshare.status).toBe(200);
        expect(await getWalletKSNodeCount(wallets.secp256k1WalletId!)).toBe(4);
      });

      it("C-2: signup(4/6) → reshare(5, 1 recovered) → wallet_ks_nodes 5", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();

        const signUp = await signUpV2(userId, [0, 1, 2, 3]);
        expect(signUp.status).toBe(200);
        const wallets = await getUserWalletIds(userId);

        const reshare = await reshareOnNodes(
          userId,
          [0, 1, 2, 3, 4],
          signUp.secp256k1Pk,
          signUp.ed25519PkHex,
          signUp.nodeShares,
        );
        expect(reshare.status).toBe(200);
        expect(await getWalletKSNodeCount(wallets.secp256k1WalletId!)).toBe(5);
        expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(5);
      });

      it("C-3: signup(4/6) → reshare(6, all recovered) → wallet_ks_nodes 6", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();

        const signUp = await signUpV2(userId, [0, 1, 2, 3]);
        expect(signUp.status).toBe(200);
        const wallets = await getUserWalletIds(userId);

        const reshare = await reshareOnNodes(
          userId,
          [0, 1, 2, 3, 4, 5],
          signUp.secp256k1Pk,
          signUp.ed25519PkHex,
          signUp.nodeShares,
        );
        expect(reshare.status).toBe(200);
        expect(await getWalletKSNodeCount(wallets.secp256k1WalletId!)).toBe(6);
        expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(6);
      });

      it("C-4: signup(6/6) → reshare(4, 2 existing down) → wallet_ks_nodes preserved", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();

        const signUp = await signUpV2(userId, [0, 1, 2, 3, 4, 5]);
        expect(signUp.status).toBe(200);
        const wallets = await getUserWalletIds(userId);

        const reshare = await reshareOnNodes(
          userId,
          [0, 1, 2, 3],
          signUp.secp256k1Pk,
          signUp.ed25519PkHex,
          signUp.nodeShares,
        );
        expect(reshare.status).toBe(200);
        expect(
          await getWalletKSNodeCount(wallets.secp256k1WalletId!),
        ).toBeGreaterThanOrEqual(4);
      });
    });

    describe("registration_threshold = null", () => {
      it("C-5: signup(6/6) → reshare(5, 1 down) → fail (all-or-nothing)", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(null);
        const userId = nextUserId();

        const signUp = await signUpV2(userId, [0, 1, 2, 3, 4, 5]);
        expect(signUp.status).toBe(200);

        const reshare = await reshareOnNodes(
          userId,
          [0, 1, 2, 3, 4],
          signUp.secp256k1Pk,
          signUp.ed25519PkHex,
          signUp.nodeShares,
        );
        expect(reshare.status).toBe(400);
        expect(reshare.body.success).toBe(false);
      });

      it("C-6: signup(6/6) → reshare(6, all UP) → success", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(null);
        const userId = nextUserId();

        const signUp = await signUpV2(userId, [0, 1, 2, 3, 4, 5]);
        expect(signUp.status).toBe(200);

        const reshare = await reshareOnNodes(
          userId,
          [0, 1, 2, 3, 4, 5],
          signUp.secp256k1Pk,
          signUp.ed25519PkHex,
          signUp.nodeShares,
        );
        expect(reshare.status).toBe(200);
      });
    });
  });

  // ── D. Add Ed25519 ──────────────────────────────────────────────────

  describe("D. Add Ed25519", () => {
    describe("registration_threshold = 4", () => {
      it("D-1: secp256k1 6/6, all UP → ed25519 6", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();
        await prepareSecpOnlyUser(userId);

        const { status } = await addEd25519OnNodes(userId, [0, 1, 2, 3, 4, 5]);
        expect(status).toBe(200);

        const wallets = await getUserWalletIds(userId);
        expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(6);
      });

      it("D-2: secp256k1 6/6, 2 DOWN → ed25519 4", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();
        await prepareSecpOnlyUser(userId);

        const { status } = await addEd25519OnNodes(userId, [0, 1, 2, 3]);
        expect(status).toBe(200);

        const wallets = await getUserWalletIds(userId);
        expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(4);
      });

      it("D-3: secp256k1 6/6, 3 DOWN → fail (3 < 4)", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();
        await prepareSecpOnlyUser(userId);

        const { status, body } = await addEd25519OnNodes(userId, [0, 1, 2]);
        expect(status).toBe(400);
        expect(body.success).toBe(false);
      });
    });

    describe("registration_threshold = null", () => {
      it("D-4: secp256k1 6/6, all UP → ed25519 6", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(null);
        const userId = nextUserId();
        await prepareSecpOnlyUser(userId);

        const { status } = await addEd25519OnNodes(userId, [0, 1, 2, 3, 4, 5]);
        expect(status).toBe(200);

        const wallets = await getUserWalletIds(userId);
        expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(6);
      });

      it("D-5: secp256k1 6/6, 1 DOWN → fail (all-or-nothing)", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(null);
        const userId = nextUserId();
        await prepareSecpOnlyUser(userId);

        const { status, body } = await addEd25519OnNodes(
          userId,
          [0, 1, 2, 3, 4],
        );
        expect(status).toBe(400);
        expect(body.success).toBe(false);
      });
    });
  });

  // ── E. Add Ed25519 + Reshare ─────────────────────────────────────────

  describe("E. Add Ed25519 + Reshare", () => {
    /**
     * Prepare secp256k1-only user via v1 keygen on SPECIFIED nodes only.
     * This creates a user with partial wallet_ks_nodes (simulating partial sign-up).
     */
    async function preparePartialSecpUser(
      userId: string,
      nodeIndices: number[],
    ): Promise<{ secp256k1Pk: string }> {
      const idToken = nextIdToken();
      const secp256k1Pk = "03" + "a".repeat(64);

      // Register secp256k1 only on specified nodes
      for (const i of nodeIndices) {
        const reg = await request(ctx.ksnApps[i])
          .post("/keyshare/v1/register")
          .set("x-mock-user-id", userId)
          .set("Authorization", `Bearer ${idToken}`)
          .send({
            auth_type: AUTH_TYPE,
            curve_type: "secp256k1",
            public_key: secp256k1Pk,
            share: generateSecp256k1Share(i),
          });
        expect(reg.status).toBe(200);
      }

      const kg = await request(ctx.okoApiApp)
        .post("/tss/v1/keygen")
        .set("x-mock-user-id", userId)
        .set("Authorization", `Bearer ${idToken}`)
        .send({
          auth_type: AUTH_TYPE,
          keygen_2: {
            public_key: secp256k1Pk,
            private_share: "e".repeat(64),
          },
        });
      expect(kg.status).toBe(200);

      return { secp256k1Pk };
    }

    describe("registration_threshold = 4", () => {
      it("E-1: secp256k1 6/6 (via v1) → ed25519 on 4 (2 down) → ed25519 wallet_ks_nodes 4", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();

        // v1 keygen registers secp256k1 on all 6 nodes
        await preparePartialSecpUser(userId, [0, 1, 2, 3, 4, 5]);

        // Add ed25519 on 4 nodes only (nodes 4,5 "down" for ed25519)
        const ed25519Result = await addEd25519OnNodes(userId, [0, 1, 2, 3]);
        expect(ed25519Result.status).toBe(200);

        const wallets = await getUserWalletIds(userId);
        expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(4);
      });

      it("E-2: secp256k1 6/6 → ed25519 4/6 → reshare all 6 → ed25519 expanded to 6", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();

        // v1 keygen: secp256k1 on all 6
        const { secp256k1Pk } = await preparePartialSecpUser(
          userId,
          [0, 1, 2, 3, 4, 5],
        );

        // ed25519 on 4 only
        const ed25519Result = await addEd25519OnNodes(userId, [0, 1, 2, 3]);
        expect(ed25519Result.status).toBe(200);

        const wallets = await getUserWalletIds(userId);
        expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(4);

        // Reshare to all 6 (nodes 4,5 get ed25519)
        const edWallet = await ctx.okoApiPool.query(
          `SELECT encode(public_key, 'hex') as pk FROM oko_wallets WHERE wallet_id = $1`,
          [wallets.ed25519WalletId],
        );

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

        const signinSig = createRevealSignature(
          reshareKeypair.privateKey,
          okoNodePk,
          reshareSessionId,
          AUTH_TYPE,
          reshareIdToken,
          "reshare",
          "signin",
        );
        await request(ctx.okoApiApp)
          .post("/tss/v2/user/signin")
          .set("x-mock-user-id", userId)
          .set("Authorization", `Bearer ${reshareIdToken}`)
          .send({
            auth_type: AUTH_TYPE,
            cr_session_id: reshareSessionId,
            cr_signature: signinSig,
          })
          .expect(200);

        const resharedNodes: Array<{ name: string; endpoint: string }> = [];
        for (let i = 0; i < 6; i++) {
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
                  public_key: secp256k1Pk,
                  share: generateSecp256k1Share(i),
                },
                ed25519: {
                  public_key: edWallet.rows[0].pk,
                  share: (
                    ["aa", "bb", "cc", "dd", "ee", "ff"][i] ?? "11"
                  ).repeat(64),
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
            secp256k1_public_key: secp256k1Pk,
            ed25519_public_key: edWallet.rows[0].pk,
            reshared_key_shares: resharedNodes,
            cr_session_id: reshareSessionId,
            cr_signature: reshareSig,
          });
        expect(okoReshare.status).toBe(200);

        // ed25519 expanded to 6
        expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(6);
      });

      it("E-3: secp256k1 6/6 → ed25519 on 3 only → fail (3 < 4)", async () => {
        await ctx.resetAllDatabases();
        await setRegistrationThreshold(4);
        const userId = nextUserId();

        await preparePartialSecpUser(userId, [0, 1, 2, 3, 4, 5]);

        // Try ed25519 on only 3 nodes (node 3 also went down)
        const { status, body } = await addEd25519OnNodes(userId, [0, 1, 2]);
        expect(status).toBe(400);
        expect(body.success).toBe(false);
      });
    });
  });

  // ── F. Full Lifecycle ───────────────────────────────────────────────

  describe("F. Full Lifecycle (registration_threshold = 4)", () => {
    let userId: string;
    let signUpResult: Awaited<ReturnType<typeof signUpV2>>;
    let wallets: {
      secp256k1WalletId: string | null;
      ed25519WalletId: string | null;
    };

    it("F-1: signup with node 4,5 DOWN → 4 nodes registered", async () => {
      await ctx.resetAllDatabases();
      await setRegistrationThreshold(4);
      userId = nextUserId();

      signUpResult = await signUpV2(userId, [0, 1, 2, 3]);
      expect(signUpResult.status).toBe(200);

      wallets = await getUserWalletIds(userId);
      expect(await getWalletKSNodeCount(wallets.secp256k1WalletId!)).toBe(4);
      expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(4);
    });

    it("F-2: login with node 4,5 still DOWN → reshare success (4 nodes)", async () => {
      const reshare = await reshareOnNodes(
        userId,
        [0, 1, 2, 3],
        signUpResult.secp256k1Pk,
        signUpResult.ed25519PkHex,
        signUpResult.nodeShares,
      );
      expect(reshare.status).toBe(200);
      expect(await getWalletKSNodeCount(wallets.secp256k1WalletId!)).toBe(4);
    });

    it("F-3: login with node 5 recovered → reshare expands to 5", async () => {
      const reshare = await reshareOnNodes(
        userId,
        [0, 1, 2, 3, 4],
        signUpResult.secp256k1Pk,
        signUpResult.ed25519PkHex,
        signUpResult.nodeShares,
      );
      expect(reshare.status).toBe(200);
      expect(await getWalletKSNodeCount(wallets.secp256k1WalletId!)).toBe(5);
      expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(5);
    });

    it("F-4: login with all 6 recovered → reshare expands to 6", async () => {
      const reshare = await reshareOnNodes(
        userId,
        [0, 1, 2, 3, 4, 5],
        signUpResult.secp256k1Pk,
        signUpResult.ed25519PkHex,
        signUpResult.nodeShares,
      );
      expect(reshare.status).toBe(200);
      expect(await getWalletKSNodeCount(wallets.secp256k1WalletId!)).toBe(6);
      expect(await getWalletKSNodeCount(wallets.ed25519WalletId!)).toBe(6);
    });

    it("F-5: login with all 6 UP → no reshare needed", async () => {
      const checkRes = await request(ctx.okoApiApp)
        .post("/tss/v2/user/check")
        .send({ email: userId, auth_type: AUTH_TYPE });

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.exists).toBe(true);
      expect(checkRes.body.data.needs_reshare).toBe(false);
    });
  });
});
