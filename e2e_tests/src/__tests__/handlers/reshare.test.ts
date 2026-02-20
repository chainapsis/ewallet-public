import request from "supertest";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import {
  runKeygenCentralizedEd25519,
  extractKeyPackageSharesEd25519,
  sssSplitEd25519,
} from "@oko-wallet/teddsa-addon/src/server";

import { createTestContext, type TestContext } from "@e2e/utils/test_context";
import {
  generateSessionId,
  generateClientKeypair,
  computeIdTokenHash,
  createRevealSignature,
} from "@e2e/utils/signature";

describe("e2e_test_reshare", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "reshare_user_123";
  const SIGNUP_ID_TOKEN = "mock_id_token_signup";
  const SIGNIN_ID_TOKEN = "mock_id_token_signin";
  const AUTH_TYPE: AuthType = "google";
  const TEST_SEED_SHARE = "a".repeat(64) + "b".repeat(64);

  type NodeShare = { secp256k1Share: string; ed25519Share: string };
  let secp256k1PublicKey: string;
  let ed25519PublicKeyHex: string;
  let nodeShares: NodeShare[];

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

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

  async function createUserRegisteredOnNodes(count: number): Promise<void> {
    // Reset DB
    await ctx.resetAllDatabases();

    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    // Keygen
    const frostKeygen = runKeygenCentralizedEd25519();
    const clientOut = frostKeygen.keygen_outputs[0];
    const serverOut = frostKeygen.keygen_outputs[1];
    const clientKeyPackage = new Uint8Array(clientOut.key_package);
    const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);
    const ed25519Pk = frostKeygen.public_key;
    ed25519PublicKeyHex = Buffer.from(ed25519Pk).toString("hex");
    secp256k1PublicKey = "03" + "a".repeat(64);

    // Split shares 2-of-3
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

    // Register to first `count` nodes
    nodeShares = [];
    for (let i = 0; i < count; i++) {
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
        SIGNUP_ID_TOKEN,
        "sign_up",
        "register",
      );

      const reg = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
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

    // oko_api keygen
    const kgSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNUP_ID_TOKEN,
      "sign_up",
      "keygen",
    );
    const kg = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
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
  }

  it("should reshare successfully to all ACTIVE nodes (validation path)", async () => {
    await createUserRegisteredOnNodes(3);

    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    // Commit oko_api & KSN with operation = reshare
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "reshare",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    // oko_api signin (allowed under reshare op) - do this before KSN reshare as in client flow
    const signinSig = createRevealSignature(
      clientKeypair.privateKey,
      okoNodePk,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "reshare",
      "signin",
    );
    const signin = await request(ctx.okoApiApp)
      .post("/tss/v2/user/signin")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        cr_session_id: sessionId,
        cr_signature: signinSig,
      });
    expect(signin.status).toBe(200);

    for (let i = 0; i < ctx.ksnApps.length; i++) {
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
        SIGNIN_ID_TOKEN,
        "reshare",
        "reshare",
      );

      const res = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/reshare")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
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
    }

    // Verify seed_share preserved on KSN[0] via get_key_shares (new sign_in session)
    const VERIFY_ID_TOKEN = "mock_id_token_verify";
    const verifyKeypair = generateClientKeypair();
    const verifySessionId = generateSessionId();
    const verifyIdHash = computeIdTokenHash(AUTH_TYPE, VERIFY_ID_TOKEN);

    const ksnVerifyCommit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: verifySessionId,
        operation_type: "sign_in",
        client_ephemeral_pubkey: verifyKeypair.publicKey.toHex(),
        id_token_hash: verifyIdHash,
      });
    expect(ksnVerifyCommit.status).toBe(200);

    const getSharesSig = createRevealSignature(
      verifyKeypair.privateKey,
      ksnVerifyCommit.body.data.node_pubkey,
      verifySessionId,
      AUTH_TYPE,
      VERIFY_ID_TOKEN,
      "sign_in",
      "get_key_shares",
    );

    const getSharesRes = await request(ctx.ksnApps[0])
      .post("/keyshare/v2")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${VERIFY_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: { ed25519: ed25519PublicKeyHex },
        cr_session_id: verifySessionId,
        cr_signature: getSharesSig,
      });
    expect(getSharesRes.status).toBe(200);
    expect(getSharesRes.body.data.ed25519).toBeDefined();
    expect(getSharesRes.body.data.ed25519.seed_share).toBe(TEST_SEED_SHARE);
  });

  it("should upsert on NEW node while validating ACTIVE nodes (KSN only)", async () => {
    // Prepare: register only on node 0 and node 1 (no oko_api keygen required for this KSN-only test)
    await ctx.resetAllDatabases();
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    // Keygen
    const frostKeygen = runKeygenCentralizedEd25519();
    const clientOut = frostKeygen.keygen_outputs[0];
    const clientKeyPackage = new Uint8Array(clientOut.key_package);
    const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);
    const edPk = frostKeygen.public_key;
    ed25519PublicKeyHex = Buffer.from(edPk).toString("hex");
    secp256k1PublicKey = "03" + "a".repeat(64);

    const sss = sssSplitEd25519(
      new Uint8Array(clientShares.signing_share),
      [
        generateNodeIdentifier(0),
        generateNodeIdentifier(1),
        generateNodeIdentifier(2),
      ],
      2,
    );
    nodeShares = [];
    for (let i = 0; i < 2; i++) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idHash,
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
        SIGNUP_ID_TOKEN,
        "sign_up",
        "register",
      );
      const reg = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNUP_ID_TOKEN}`)
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

    // Now reshare to node 2 (upsert path)
    const reshareSession = generateSessionId();
    const idHash2 = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);
    const ksnCommit2 = await request(ctx.ksnApps[2])
      .post("/keyshare/v2/commit")
      .send({
        session_id: reshareSession,
        operation_type: "reshare",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idHash2,
      });
    expect(ksnCommit2.status).toBe(200);

    const shareForNode2 = (() => {
      const kpBytes = new Uint8Array(sss.key_packages[2].key_package);
      const shares = extractKeyPackageSharesEd25519(kpBytes);
      const edShare =
        Buffer.from(shares.signing_share).toString("hex") +
        Buffer.from(shares.verifying_share).toString("hex");
      return { secp256k1: generateSecp256k1Share(2), ed25519: edShare };
    })();

    const sig2 = createRevealSignature(
      clientKeypair.privateKey,
      ksnCommit2.body.data.node_pubkey,
      reshareSession,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "reshare",
      "reshare",
    );
    const res2 = await request(ctx.ksnApps[2])
      .post("/keyshare/v2/reshare")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: {
            public_key: secp256k1PublicKey,
            share: shareForNode2.secp256k1,
          },
          ed25519: {
            public_key: ed25519PublicKeyHex,
            share: shareForNode2.ed25519,
            seed_share: TEST_SEED_SHARE,
          },
        },
        cr_session_id: reshareSession,
        cr_signature: sig2,
      });
    expect(res2.status).toBe(200);
  });

  it("should reject reshare when ed25519 wallet is missing (INVALID_REQUEST)", async () => {
    await createUserRegisteredOnNodes(3);
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const ksnCommit = await request(ctx.ksnApps[0])
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
      SIGNIN_ID_TOKEN,
      "reshare",
      "reshare",
    );
    const res = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/reshare")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: {
            public_key: secp256k1PublicKey,
            share: nodeShares[0].secp256k1Share,
          },
          // ed25519 missing
        },
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_REQUEST");
  });

  it("should reject reshare with share mismatch (RESHARE_FAILED)", async () => {
    await createUserRegisteredOnNodes(3);
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const ksnCommit = await request(ctx.ksnApps[0])
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
      SIGNIN_ID_TOKEN,
      "reshare",
      "reshare",
    );
    const res = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/reshare")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: { public_key: secp256k1PublicKey, share: "ff".repeat(64) }, // wrong
          ed25519: {
            public_key: ed25519PublicKeyHex,
            share: nodeShares[0].ed25519Share,
            seed_share: TEST_SEED_SHARE,
          },
        },
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("RESHARE_FAILED");
  });

  it("should reject reshare with invalid signature", async () => {
    await createUserRegisteredOnNodes(3);
    const clientKeypair = generateClientKeypair();
    const wrongKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idHash = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const ksnCommit = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "reshare",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idHash,
      });
    expect(ksnCommit.status).toBe(200);

    const sig = createRevealSignature(
      wrongKeypair.privateKey,
      ksnCommit.body.data.node_pubkey,
      sessionId,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "reshare",
      "reshare",
    );
    const res = await request(ctx.ksnApps[0])
      .post("/keyshare/v2/reshare")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: {
            public_key: secp256k1PublicKey,
            share: nodeShares[0].secp256k1Share,
          },
          ed25519: {
            public_key: ed25519PublicKeyHex,
            share: nodeShares[0].ed25519Share,
            seed_share: TEST_SEED_SHARE,
          },
        },
        cr_session_id: sessionId,
        cr_signature: sig,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_SIGNATURE");
  });
});
