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

describe("e2e_test_report_then_reshare", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "report_then_reshare_user";
  const SIGNUP_ID_TOKEN = "mock_id_token_signup";
  const SIGNIN_ID_TOKEN = "mock_id_token_signin";
  const AUTH_TYPE: AuthType = "google";

  type NodeShare = { secp256k1Share: string; ed25519Share: string };
  let secp256k1PublicKey: string;
  let ed25519PublicKeyHex: string;
  let nodeShares: NodeShare[];
  let jwtFromKeygen: string;

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

  async function createUserRegisteredOnAllNodes(): Promise<void> {
    await ctx.resetAllDatabases();

    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, SIGNUP_ID_TOKEN);

    // FROST 2-of-2 keygen (client + server)
    const frostKeygen = runKeygenCentralizedEd25519();
    const clientOut = frostKeygen.keygen_outputs[0];
    const serverOut = frostKeygen.keygen_outputs[1];
    const clientKeyPackage = new Uint8Array(clientOut.key_package);
    const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);
    const edPk = frostKeygen.public_key;
    ed25519PublicKeyHex = Buffer.from(edPk).toString("hex");
    secp256k1PublicKey = "03" + "a".repeat(64);

    // Split client signing share for 3 nodes (2-of-3)
    const signingShare = new Uint8Array(clientShares.signing_share);
    const sss = sssSplitEd25519(
      signingShare,
      [
        generateNodeIdentifier(0),
        generateNodeIdentifier(1),
        generateNodeIdentifier(2),
      ],
      2,
    );

    // Commit to oko_api (sign_up)
    const okoCommit = await request(ctx.okoApiApp).post("/tss/v2/commit").send({
      session_id: sessionId,
      operation_type: "sign_up",
      client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
      id_token_hash: idTokenHash,
    });
    expect(okoCommit.status).toBe(200);
    const okoNodePk = okoCommit.body.data.node_pubkey;

    // Register on all KSNs
    nodeShares = [];
    for (let i = 0; i < ctx.ksnApps.length; i++) {
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
            },
          },
          cr_session_id: sessionId,
          cr_signature: regSig,
        });
      expect(reg.status).toBe(200);
    }

    // oko_api keygen (v2)
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
          public_key: edPk,
        },
        cr_session_id: sessionId,
        cr_signature: kgSig,
      });
    expect(kg.status).toBe(200);
    jwtFromKeygen = kg.body.data.token as string;
  }

  it("first login reports missing node, next login shows needs_reshare then performs reshare", async () => {
    await createUserRegisteredOnAllNodes();

    // Simulate data loss on node index 1 (2nd node): delete key_shares on that node
    await ctx.ksnPools[1].query('DELETE FROM "2_key_shares"');

    // First login (sign_in): commit + signin
    const clientKeypair1 = generateClientKeypair();
    const session1 = generateSessionId();
    const idHash1 = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN);

    const okoCommit1 = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: session1,
        operation_type: "sign_in",
        client_ephemeral_pubkey: clientKeypair1.publicKey.toHex(),
        id_token_hash: idHash1,
      });
    expect(okoCommit1.status).toBe(200);
    const okoNodePk1 = okoCommit1.body.data.node_pubkey;

    const signinSig1 = createRevealSignature(
      clientKeypair1.privateKey,
      okoNodePk1,
      session1,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "signin",
    );
    const signin1 = await request(ctx.okoApiApp)
      .post("/tss/v2/user/signin")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        cr_session_id: session1,
        cr_signature: signinSig1,
      });
    expect(signin1.status).toBe(200);

    // On node 2 (index 1), commit + get_key_shares should return KEY_SHARE_NOT_FOUND
    const ksnCommit1 = await request(ctx.ksnApps[1])
      .post("/keyshare/v2/commit")
      .send({
        session_id: session1,
        operation_type: "sign_in",
        client_ephemeral_pubkey: clientKeypair1.publicKey.toHex(),
        id_token_hash: idHash1,
      });
    expect(ksnCommit1.status).toBe(200);
    const gSig1 = createRevealSignature(
      clientKeypair1.privateKey,
      ksnCommit1.body.data.node_pubkey,
      session1,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN,
      "sign_in",
      "get_key_shares",
    );
    const g1 = await request(ctx.ksnApps[1])
      .post("/keyshare/v2")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        wallets: {
          secp256k1: secp256k1PublicKey,
          ed25519: ed25519PublicKeyHex,
        },
        cr_session_id: session1,
        cr_signature: gSig1,
      });
    expect(g1.status).toBe(404);
    expect(["KEY_SHARE_NOT_FOUND", "WALLET_NOT_FOUND"]).toContain(g1.body.code);

    // Report missing node to oko_api (JWT from keygen is enough)
    const nodeInfo = ctx.ksnUrls.map((url, i) => ({
      name: `test_node_${i + 1}`,
      endpoint: url,
    }));
    const report = await request(ctx.okoApiApp)
      .post("/tss/v2/user/report_key_share_not_found")
      .set("Authorization", `Bearer ${jwtFromKeygen}`)
      .send({ nodes: [nodeInfo[1]] });
    expect(report.status).toBe(200);
    expect(report.body.success).toBe(true);

    // Next login: unified check should indicate needs_reshare=true
    const check = await request(ctx.okoApiApp)
      .post("/tss/v2/user/check")
      .send({ email: TEST_USER_ID, auth_type: AUTH_TYPE });
    expect(check.status).toBe(200);
    expect(check.body.success).toBe(true);
    expect(check.body.data.needs_reshare).toBe(true);

    // Perform reshare to all nodes (KSN) under operation=resahre
    const clientKeypair2 = generateClientKeypair();
    const session2 = generateSessionId();
    const SIGNIN_ID_TOKEN_2 = `${SIGNIN_ID_TOKEN}_2`;
    const idHash2 = computeIdTokenHash(AUTH_TYPE, SIGNIN_ID_TOKEN_2);

    const okoCommit2 = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: session2,
        operation_type: "reshare",
        client_ephemeral_pubkey: clientKeypair2.publicKey.toHex(),
        id_token_hash: idHash2,
      });
    expect(okoCommit2.status).toBe(200);
    const okoNodePk2 = okoCommit2.body.data.node_pubkey;

    // oko_api signin allowed under reshare
    const signinSig2 = createRevealSignature(
      clientKeypair2.privateKey,
      okoNodePk2,
      session2,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN_2,
      "reshare",
      "signin",
    );
    const signin2 = await request(ctx.okoApiApp)
      .post("/tss/v2/user/signin")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN_2}`)
      .send({
        auth_type: AUTH_TYPE,
        cr_session_id: session2,
        cr_signature: signinSig2,
      });
    expect(signin2.status).toBe(200);

    // Reshare on each KSN
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const ksnCommit = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: session2,
          operation_type: "reshare",
          client_ephemeral_pubkey: clientKeypair2.publicKey.toHex(),
          id_token_hash: idHash2,
        });
      expect(ksnCommit.status).toBe(200);

      const sig = createRevealSignature(
        clientKeypair2.privateKey,
        ksnCommit.body.data.node_pubkey,
        session2,
        AUTH_TYPE,
        SIGNIN_ID_TOKEN_2,
        "reshare",
        "reshare",
      );

      const res = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/reshare")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN_2}`)
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
            },
          },
          cr_session_id: session2,
          cr_signature: sig,
        });
      expect(res.status).toBe(200);
    }

    // oko_api user/reshare to update wallet_ks_nodes mapping
    const resharedNodes = ctx.ksnUrls.map((url, i) => ({
      name: `test_node_${i + 1}`,
      endpoint: url,
    }));
    const userReshareSig = createRevealSignature(
      clientKeypair2.privateKey,
      okoNodePk2,
      session2,
      AUTH_TYPE,
      SIGNIN_ID_TOKEN_2,
      "reshare",
      "reshare",
    );
    const userReshare = await request(ctx.okoApiApp)
      .post("/tss/v2/user/reshare")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${SIGNIN_ID_TOKEN_2}`)
      .send({
        auth_type: AUTH_TYPE,
        secp256k1_public_key: secp256k1PublicKey,
        ed25519_public_key: ed25519PublicKeyHex,
        reshared_key_shares: resharedNodes,
        cr_session_id: session2,
        cr_signature: userReshareSig,
      });
    if (userReshare.status !== 200) {
      // Help diagnose in CI runs
      // eslint-disable-next-line no-console
      console.log("userReshare error:", userReshare.body);
    }
    expect(userReshare.status).toBe(200);
    expect(userReshare.body.success).toBe(true);

    // Final check: needs_reshare=false after reshare
    const check2 = await request(ctx.okoApiApp)
      .post("/tss/v2/user/check")
      .send({ email: TEST_USER_ID, auth_type: AUTH_TYPE });
    expect(check2.status).toBe(200);
    expect(check2.body.success).toBe(true);
    expect(check2.body.data.needs_reshare).toBe(false);
  });
});
