import request from "supertest";
import { createTestContext, type TestContext } from "@e2e/utils/test_context";
import {
  generateSessionId,
  generateClientKeypair,
  computeIdTokenHash,
  createRevealSignature,
} from "@e2e/utils/signature";
import type { AuthType } from "@oko-wallet/oko-types/auth";
import {
  runKeygenCentralizedEd25519,
  extractKeyPackageSharesEd25519,
} from "@oko-wallet/teddsa-addon/src/server";

describe("handleNewUserV2", () => {
  let ctx: TestContext;

  const TEST_USER_ID = "test_user_123";
  const TEST_ID_TOKEN = "mock_id_token_for_testing";
  const AUTH_TYPE: AuthType = "google";

  beforeAll(async () => {
    ctx = await createTestContext();
    await ctx.resetAllDatabases();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    await ctx.resetAllDatabases();
  });

  it("should complete full sign-up flow: commit -> KSN register -> keygen", async () => {
    // 1. Generate client keypair and session
    const clientKeypair = generateClientKeypair();
    const sessionId = generateSessionId();
    const idTokenHash = computeIdTokenHash(AUTH_TYPE, TEST_ID_TOKEN);

    // Generate real FROST ed25519 keys using napi addon
    const frostKeygen = runKeygenCentralizedEd25519();
    const clientFrostOutput = frostKeygen.keygen_outputs[0]; // P0 = client
    const serverFrostOutput = frostKeygen.keygen_outputs[1]; // P1 = server

    // Extract client's shares for KSN registration
    const clientKeyPackage = new Uint8Array(clientFrostOutput.key_package);
    const clientShares = extractKeyPackageSharesEd25519(clientKeyPackage);
    const clientShareHex =
      Buffer.from(clientShares.signing_share).toString("hex") +
      Buffer.from(clientShares.verifying_share).toString("hex");

    const ed25519PublicKey = frostKeygen.public_key; // 32 bytes
    const ed25519PublicKeyHex = Buffer.from(ed25519PublicKey).toString("hex");

    // 2. Commit to oko_api
    const okoApiCommitRes = await request(ctx.okoApiApp)
      .post("/tss/v2/commit")
      .send({
        session_id: sessionId,
        operation_type: "sign_up",
        client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
        id_token_hash: idTokenHash,
      });

    expect(okoApiCommitRes.status).toBe(200);
    expect(okoApiCommitRes.body.success).toBe(true);
    expect(okoApiCommitRes.body.data.node_pubkey).toBeDefined();

    const okoApiNodePubkey = okoApiCommitRes.body.data.node_pubkey;

    // 3. Commit to all KSN nodes
    const ksnNodePubkeys: string[] = [];
    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const ksnCommitRes = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/commit")
        .send({
          session_id: sessionId,
          operation_type: "sign_up",
          client_ephemeral_pubkey: clientKeypair.publicKey.toHex(),
          id_token_hash: idTokenHash,
        });

      expect(ksnCommitRes.status).toBe(200);
      expect(ksnCommitRes.body.success).toBe(true);
      ksnNodePubkeys.push(ksnCommitRes.body.data.node_pubkey);
    }

    // 4. Register key shares to all KSN nodes
    const mockSecp256k1PublicKey = "03" + "a".repeat(64); // 33 bytes compressed

    for (let i = 0; i < ctx.ksnApps.length; i++) {
      const signature = createRevealSignature(
        clientKeypair.privateKey,
        ksnNodePubkeys[i],
        sessionId,
        AUTH_TYPE,
        TEST_ID_TOKEN,
        "sign_up",
        "register",
      );

      const registerRes = await request(ctx.ksnApps[i])
        .post("/keyshare/v2/register")
        .set("x-mock-user-id", TEST_USER_ID)
        .set("Authorization", `Bearer ${TEST_ID_TOKEN}`)
        .send({
          auth_type: AUTH_TYPE,
          wallets: {
            secp256k1: {
              public_key: mockSecp256k1PublicKey,
              share: "c".repeat(128), // 64 bytes
            },
            ed25519: {
              public_key: ed25519PublicKeyHex,
              share: clientShareHex, // 64 bytes (signing_share + verifying_share)
            },
          },
          cr_session_id: sessionId,
          cr_signature: signature,
          cr_final: true,
        });

      expect(registerRes.status).toBe(200);
      expect(registerRes.body.success).toBe(true);
    }

    // 5. Call keygen to oko_api
    const keygenSignature = createRevealSignature(
      clientKeypair.privateKey,
      okoApiNodePubkey,
      sessionId,
      AUTH_TYPE,
      TEST_ID_TOKEN,
      "sign_up",
      "keygen",
    );

    const keygenRes = await request(ctx.okoApiApp)
      .post("/tss/v2/keygen")
      .set("x-mock-user-id", TEST_USER_ID)
      .set("Authorization", `Bearer ${TEST_ID_TOKEN}`)
      .send({
        auth_type: AUTH_TYPE,
        keygen_2_secp256k1: {
          public_key: mockSecp256k1PublicKey,
          private_share: "e".repeat(64), // 32 bytes
        },
        keygen_2_ed25519: {
          key_package: serverFrostOutput.key_package,
          public_key_package: Buffer.from(
            serverFrostOutput.public_key_package,
          ).toString("hex"),
          identifier: serverFrostOutput.identifier,
          public_key: ed25519PublicKey,
        },
        cr_session_id: sessionId,
        cr_signature: keygenSignature,
        cr_final: true,
      });

    if (keygenRes.status !== 200) {
      console.error("Keygen failed:", keygenRes.body);
    }
    expect(keygenRes.status).toBe(200);
    expect(keygenRes.body.success).toBe(true);
    expect(keygenRes.body.data.user).toBeDefined();
    expect(keygenRes.body.data.user.public_key_secp256k1).toBe(
      mockSecp256k1PublicKey,
    );
    expect(keygenRes.body.data.user.public_key_ed25519).toBe(ed25519PublicKeyHex);
    expect(keygenRes.body.data.token).toBeDefined();
  });
});
