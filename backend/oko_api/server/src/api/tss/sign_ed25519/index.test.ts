import { Pool } from "pg";
import type {
  SignEd25519Round1Request,
  SignEd25519Round2Request,
} from "@oko-wallet/oko-types/tss";
import {
  TssStageType,
  SignEd25519StageStatus,
  TssSessionState,
} from "@oko-wallet/oko-types/tss";
import { getTssStageWithSessionData } from "@oko-wallet/oko-pg-interface/tss";
import { Participant } from "@oko-wallet/teddsa-interface";
import {
  runKeygenCentralizedEd25519,
  runSignRound1Ed25519 as clientRunSignRound1Ed25519,
  runSignRound2Ed25519 as clientRunSignRound2Ed25519,
  runAggregateEd25519 as clientRunAggregateEd25519,
  runVerifyEd25519,
  extractKeyPackageSharesEd25519,
} from "@oko-wallet/teddsa-addon/src/server";
import { createPgConn } from "@oko-wallet/postgres-lib";
import type { WalletStatus } from "@oko-wallet/oko-types/wallets";
import { insertKSNode } from "@oko-wallet/oko-pg-interface/ks_nodes";
import { createWallet } from "@oko-wallet/oko-pg-interface/oko_wallets";
import { createUser } from "@oko-wallet/oko-pg-interface/oko_users";
import { insertKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";
import { insertCustomer } from "@oko-wallet/oko-pg-interface/customers";
import { encryptDataAsync } from "@oko-wallet/crypto-js/node";

import { resetPgDatabase } from "@oko-wallet-api/testing/database";
import { testPgConfig } from "@oko-wallet-api/database/test_config";
import {
  runSignEd25519Round1,
  runSignEd25519Round2,
} from "@oko-wallet-api/api/tss/sign_ed25519";
import { TEMP_ENC_SECRET } from "@oko-wallet-api/api/tss/utils";

const SSS_THRESHOLD = 2;
const TEST_EMAIL = "test-ed25519@test.com";
const TEST_SEED_SHARE = "a".repeat(64) + "b".repeat(64);

interface TestSetupResult {
  pool: Pool;
  walletId: string;
  customerId: string;
  clientKeygenOutput: ReturnType<
    typeof runKeygenCentralizedEd25519
  >["keygen_outputs"][Participant.P0];
  serverKeygenOutput: ReturnType<
    typeof runKeygenCentralizedEd25519
  >["keygen_outputs"][Participant.P1];
}

async function setUpKSNodes(pool: Pool): Promise<string[]> {
  const ksNodeNames = ["ksNode1", "ksNode2"];
  const ksNodeIds = [];
  const createKSNodesRes = await Promise.all(
    ksNodeNames.map((ksNodeName) =>
      insertKSNode(pool, ksNodeName, `http://test.com/${ksNodeName}`),
    ),
  );
  for (const res of createKSNodesRes) {
    if (res.success === false) {
      throw new Error("Failed to create ks nodes");
    }
    ksNodeIds.push(res.data.node_id);
  }
  return ksNodeIds;
}

async function setUpEd25519Wallet(pool: Pool): Promise<TestSetupResult> {
  // Generate keys using centralized keygen
  const keygenResult = runKeygenCentralizedEd25519();
  const clientKeygenOutput = keygenResult.keygen_outputs[Participant.P0];
  const serverKeygenOutput = keygenResult.keygen_outputs[Participant.P1];

  // Set up KS nodes and metadata
  const ksNodeIds = await setUpKSNodes(pool);
  await insertKeyShareNodeMeta(pool, {
    sss_threshold: SSS_THRESHOLD,
  });

  // Create customer
  const customerId = crypto.randomUUID();
  const insertCustomerRes = await insertCustomer(pool, {
    customer_id: customerId,
    label: "test-customer",
    status: "ACTIVE",
    url: null,
    logo_url: null,
    theme: "dark",
  });
  if (insertCustomerRes.success === false) {
    throw new Error(`Failed to create customer: ${insertCustomerRes.err}`);
  }

  // Create user
  const createUserRes = await createUser(pool, TEST_EMAIL, "google");
  if (createUserRes.success === false) {
    throw new Error(`Failed to create user: ${createUserRes.err}`);
  }
  const userId = createUserRes.data.user_id;

  // Extract signing_share and verifying_share from server key_package
  const serverKeyPackageShares = extractKeyPackageSharesEd25519(
    new Uint8Array(serverKeygenOutput.key_package),
  );

  // Store signing_share, verifying_share, and seed_share
  const sharesData = {
    signing_share: serverKeyPackageShares.signing_share,
    verifying_share: serverKeyPackageShares.verifying_share,
    seed_share: TEST_SEED_SHARE,
  };

  const encryptedShare = await encryptDataAsync(
    JSON.stringify(sharesData),
    TEMP_ENC_SECRET,
  );

  // Create Ed25519 wallet
  const createWalletRes = await createWallet(pool, {
    user_id: userId,
    curve_type: "ed25519",
    public_key: Buffer.from(keygenResult.public_key),
    enc_tss_share: Buffer.from(encryptedShare, "utf-8"),
    sss_threshold: SSS_THRESHOLD,
    status: "ACTIVE" as WalletStatus,
  });
  if (createWalletRes.success === false) {
    throw new Error(`Failed to create wallet: ${createWalletRes.err}`);
  }
  const walletId = createWalletRes.data.wallet_id;

  return {
    pool,
    walletId,
    customerId,
    clientKeygenOutput,
    serverKeygenOutput,
  };
}

describe("Ed25519 Signing", () => {
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

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await resetPgDatabase(pool);
  });

  describe("runSignEd25519Round1", () => {
    it("should generate commitments successfully", async () => {
      const { walletId, customerId } = await setUpEd25519Wallet(pool);
      const testMessage = new TextEncoder().encode("Test message");

      const request: SignEd25519Round1Request = {
        email: TEST_EMAIL,
        wallet_id: walletId,
        customer_id: customerId,
        msg: [...testMessage],
      };

      const result = await runSignEd25519Round1(pool, TEMP_ENC_SECRET, request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.session_id).toBeDefined();
        expect(result.data.commitments_0).toBeDefined();
        expect(result.data.commitments_0.identifier).toBeDefined();
        expect(result.data.commitments_0.commitments).toBeDefined();
        expect(Array.isArray(result.data.commitments_0.identifier)).toBe(true);
        expect(Array.isArray(result.data.commitments_0.commitments)).toBe(true);

        // Verify stage status is ROUND_1
        const getStageRes = await getTssStageWithSessionData(
          pool,
          result.data.session_id,
          TssStageType.SIGN_ED25519,
        );
        expect(getStageRes.success).toBe(true);
        if (getStageRes.success && getStageRes.data) {
          expect(getStageRes.data.stage_status).toBe(
            SignEd25519StageStatus.ROUND_1,
          );
          expect(getStageRes.data.session_state).toBe(
            TssSessionState.IN_PROGRESS,
          );
        }
      }
    });

    it("should fail with invalid email", async () => {
      const { walletId, customerId } = await setUpEd25519Wallet(pool);
      const testMessage = new TextEncoder().encode("Test message");

      const request: SignEd25519Round1Request = {
        email: "wrong@test.com",
        wallet_id: walletId,
        customer_id: customerId,
        msg: [...testMessage],
      };

      const result = await runSignEd25519Round1(pool, TEMP_ENC_SECRET, request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("UNAUTHORIZED");
      }
    });

    it("should fail with invalid wallet_id", async () => {
      const { customerId } = await setUpEd25519Wallet(pool);
      const testMessage = new TextEncoder().encode("Test message");

      const request: SignEd25519Round1Request = {
        email: TEST_EMAIL,
        wallet_id: "00000000-0000-0000-0000-000000000000",
        customer_id: customerId,
        msg: [...testMessage],
      };

      const result = await runSignEd25519Round1(pool, TEMP_ENC_SECRET, request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("runSignEd25519Round2", () => {
    it("should generate signature share successfully", async () => {
      const { walletId, customerId, clientKeygenOutput } =
        await setUpEd25519Wallet(pool);
      const testMessage = new TextEncoder().encode("Test message for Ed25519");

      // Round 1: Get server commitments
      const round1Request: SignEd25519Round1Request = {
        email: TEST_EMAIL,
        wallet_id: walletId,
        customer_id: customerId,
        msg: [...testMessage],
      };
      const round1Result = await runSignEd25519Round1(
        pool,
        TEMP_ENC_SECRET,
        round1Request,
      );
      expect(round1Result.success).toBe(true);
      if (!round1Result.success) {
        throw new Error("Round 1 failed");
      }

      // Client generates their round 1 output
      const clientRound1 = clientRunSignRound1Ed25519(
        new Uint8Array(clientKeygenOutput.key_package),
      );

      // Round 2: Get server signature share
      const round2Request: SignEd25519Round2Request = {
        email: TEST_EMAIL,
        wallet_id: walletId,
        session_id: round1Result.data.session_id,
        commitments_1: {
          identifier: clientRound1.identifier,
          commitments: clientRound1.commitments,
        },
      };
      const round2Result = await runSignEd25519Round2(
        pool,
        TEMP_ENC_SECRET,
        round2Request,
      );

      expect(round2Result.success).toBe(true);
      if (round2Result.success) {
        expect(round2Result.data.signature_share_0).toBeDefined();
        expect(round2Result.data.signature_share_0.identifier).toBeDefined();
        expect(
          round2Result.data.signature_share_0.signature_share,
        ).toBeDefined();

        // Verify stage status is COMPLETED after round2
        const getStageRes = await getTssStageWithSessionData(
          pool,
          round1Result.data.session_id,
          TssStageType.SIGN_ED25519,
        );
        expect(getStageRes.success).toBe(true);
        if (getStageRes.success && getStageRes.data) {
          expect(getStageRes.data.stage_status).toBe(
            SignEd25519StageStatus.COMPLETED,
          );
          expect(getStageRes.data.session_state).toBe(
            TssSessionState.COMPLETED,
          );
        }
      }
    });

    it("should fail with invalid session_id", async () => {
      const { walletId, customerId, clientKeygenOutput } =
        await setUpEd25519Wallet(pool);
      const testMessage = new TextEncoder().encode("Test message");

      const clientRound1 = clientRunSignRound1Ed25519(
        new Uint8Array(clientKeygenOutput.key_package),
      );

      const round2Request: SignEd25519Round2Request = {
        email: TEST_EMAIL,
        wallet_id: walletId,
        session_id: "00000000-0000-0000-0000-000000000000",
        commitments_1: {
          identifier: clientRound1.identifier,
          commitments: clientRound1.commitments,
        },
      };
      const result = await runSignEd25519Round2(
        pool,
        TEMP_ENC_SECRET,
        round2Request,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("INVALID_TSS_SESSION");
      }
    });

    it("should fail when Round2 is called twice (duplicate call prevention)", async () => {
      const { walletId, customerId, clientKeygenOutput } =
        await setUpEd25519Wallet(pool);
      const testMessage = new TextEncoder().encode("Test message");

      // Round 1: Get server commitments
      const round1Request: SignEd25519Round1Request = {
        email: TEST_EMAIL,
        wallet_id: walletId,
        customer_id: customerId,
        msg: [...testMessage],
      };
      const round1Result = await runSignEd25519Round1(
        pool,
        TEMP_ENC_SECRET,
        round1Request,
      );
      expect(round1Result.success).toBe(true);
      if (!round1Result.success) {
        throw new Error("Round 1 failed");
      }

      const clientRound1 = clientRunSignRound1Ed25519(
        new Uint8Array(clientKeygenOutput.key_package),
      );

      // First Round 2 call - should succeed
      const round2Request: SignEd25519Round2Request = {
        email: TEST_EMAIL,
        wallet_id: walletId,
        session_id: round1Result.data.session_id,
        commitments_1: {
          identifier: clientRound1.identifier,
          commitments: clientRound1.commitments,
        },
      };
      const round2Result = await runSignEd25519Round2(
        pool,
        TEMP_ENC_SECRET,
        round2Request,
      );
      expect(round2Result.success).toBe(true);

      // Verify stage status is COMPLETED after first Round2 call
      const getStageRes = await getTssStageWithSessionData(
        pool,
        round1Result.data.session_id,
        TssStageType.SIGN_ED25519,
      );
      expect(getStageRes.success).toBe(true);
      if (getStageRes.success && getStageRes.data) {
        expect(getStageRes.data.stage_status).toBe(
          SignEd25519StageStatus.COMPLETED,
        );
      }

      // Second Round 2 call with same session - should fail (already COMPLETED)
      const duplicateRound2Result = await runSignEd25519Round2(
        pool,
        TEMP_ENC_SECRET,
        round2Request,
      );

      expect(duplicateRound2Result.success).toBe(false);
      if (!duplicateRound2Result.success) {
        expect(duplicateRound2Result.code).toBe("INVALID_TSS_SESSION");
      }
    });

    it("should fail when using COMPLETED session for Round2", async () => {
      const { walletId, customerId, clientKeygenOutput } =
        await setUpEd25519Wallet(pool);
      const testMessage = new TextEncoder().encode("Test message for signing");

      // Complete signing flow (round2 now completes the session)
      const round1Res = await runSignEd25519Round1(pool, TEMP_ENC_SECRET, {
        email: TEST_EMAIL,
        wallet_id: walletId,
        customer_id: customerId,
        msg: [...testMessage],
      });
      expect(round1Res.success).toBe(true);
      if (!round1Res.success) {
        throw new Error("Round 1 failed");
      }

      const clientR1 = clientRunSignRound1Ed25519(
        new Uint8Array(clientKeygenOutput.key_package),
      );

      const round2Res = await runSignEd25519Round2(pool, TEMP_ENC_SECRET, {
        email: TEST_EMAIL,
        wallet_id: walletId,
        session_id: round1Res.data.session_id,
        commitments_1: {
          identifier: clientR1.identifier,
          commitments: clientR1.commitments,
        },
      });
      expect(round2Res.success).toBe(true);
      if (!round2Res.success) {
        throw new Error("Round 2 failed");
      }

      // Verify stage status is COMPLETED after round2
      const getStageRes = await getTssStageWithSessionData(
        pool,
        round1Res.data.session_id,
        TssStageType.SIGN_ED25519,
      );
      expect(getStageRes.success).toBe(true);
      if (getStageRes.success && getStageRes.data) {
        expect(getStageRes.data.stage_status).toBe(
          SignEd25519StageStatus.COMPLETED,
        );
        expect(getStageRes.data.session_state).toBe(TssSessionState.COMPLETED);
      }

      // Now try to use the COMPLETED session for Round2 - should fail
      const newClientR1 = clientRunSignRound1Ed25519(
        new Uint8Array(clientKeygenOutput.key_package),
      );
      const replayRound2Res = await runSignEd25519Round2(
        pool,
        TEMP_ENC_SECRET,
        {
          email: TEST_EMAIL,
          wallet_id: walletId,
          session_id: round1Res.data.session_id, // Reusing completed session
          commitments_1: {
            identifier: newClientR1.identifier,
            commitments: newClientR1.commitments,
          },
        },
      );

      expect(replayRound2Res.success).toBe(false);
      if (!replayRound2Res.success) {
        expect(replayRound2Res.code).toBe("INVALID_TSS_SESSION");
      }
    });
  });

  describe("Full signing flow", () => {
    it("should complete full signing flow with valid signature verification", async () => {
      const { walletId, customerId, clientKeygenOutput } =
        await setUpEd25519Wallet(pool);
      const messages = [
        "Hello, Solana!",
        "Transaction data",
        "Another message to sign",
      ];

      for (const msgStr of messages) {
        const message = new TextEncoder().encode(msgStr);

        // Round 1
        const round1Res = await runSignEd25519Round1(pool, TEMP_ENC_SECRET, {
          email: TEST_EMAIL,
          wallet_id: walletId,
          customer_id: customerId,
          msg: [...message],
        });
        expect(round1Res.success).toBe(true);
        if (!round1Res.success) {
          continue;
        }

        const clientR1 = clientRunSignRound1Ed25519(
          new Uint8Array(clientKeygenOutput.key_package),
        );

        const allCommitments = [
          {
            identifier: clientR1.identifier,
            commitments: clientR1.commitments,
          },
          {
            identifier: round1Res.data.commitments_0.identifier,
            commitments: round1Res.data.commitments_0.commitments,
          },
        ].sort((a, b) => (a.identifier[0] ?? 0) - (b.identifier[0] ?? 0));

        // Round 2 (now completes the session)
        const round2Res = await runSignEd25519Round2(pool, TEMP_ENC_SECRET, {
          email: TEST_EMAIL,
          wallet_id: walletId,
          session_id: round1Res.data.session_id,
          commitments_1: {
            identifier: clientR1.identifier,
            commitments: clientR1.commitments,
          },
        });
        expect(round2Res.success).toBe(true);
        if (!round2Res.success) {
          continue;
        }

        // Verify stage status is COMPLETED after round2
        const getStageRes = await getTssStageWithSessionData(
          pool,
          round1Res.data.session_id,
          TssStageType.SIGN_ED25519,
        );
        if (getStageRes.success && getStageRes.data) {
          expect(getStageRes.data.stage_status).toBe(
            SignEd25519StageStatus.COMPLETED,
          );
          expect(getStageRes.data.session_state).toBe(
            TssSessionState.COMPLETED,
          );
        }

        // Client generates their round2 output
        const clientR2 = clientRunSignRound2Ed25519(
          message,
          new Uint8Array(clientKeygenOutput.key_package),
          new Uint8Array(clientR1.nonces),
          allCommitments,
        );

        const allShares = [
          {
            identifier: clientR2.identifier,
            signature_share: clientR2.signature_share,
          },
          {
            identifier: round2Res.data.signature_share_0.identifier,
            signature_share: round2Res.data.signature_share_0.signature_share,
          },
        ].sort((a, b) => (a.identifier[0] ?? 0) - (b.identifier[0] ?? 0));

        // Client-side aggregation
        const aggregateResult = clientRunAggregateEd25519(
          message,
          allCommitments,
          allShares,
          new Uint8Array(clientKeygenOutput.public_key_package),
        );

        expect(aggregateResult.signature.length).toBe(64);

        // Verify the signature
        const isValid = runVerifyEd25519(
          message,
          new Uint8Array(aggregateResult.signature),
          new Uint8Array(clientKeygenOutput.public_key_package),
        );
        expect(isValid).toBe(true);
      }
    });
  });
});
