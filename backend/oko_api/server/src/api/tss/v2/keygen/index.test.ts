import { jest } from "@jest/globals";
import { Pool } from "pg";
import type { Logger } from "winston";
import type { WalletStatus } from "@oko-wallet/oko-types/wallets";
import {
  type KeygenRequestV2,
  type KeygenEd25519Request,
} from "@oko-wallet/oko-types/tss";
import { Participant } from "@oko-wallet/tecdsa-interface";
import { napiRunKeygenClientCentralized } from "@oko-wallet/cait-sith-keplr-addon/addon";
import {
  runKeygenCentralizedEd25519,
  extractKeyPackageSharesEd25519,
} from "@oko-wallet/teddsa-addon/src/server";
import {
  insertKSNode,
  getWalletKSNodesByWalletId,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import {
  decryptData,
  decryptDataAsync,
  encryptDataAsync,
} from "@oko-wallet/crypto-js/node";
import { createPgConn } from "@oko-wallet/postgres-lib";
import { createUser } from "@oko-wallet/oko-pg-interface/oko_users";
import {
  createWallet,
  getWalletById,
} from "@oko-wallet/oko-pg-interface/oko_wallets";
import { insertKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";

import { resetPgDatabase } from "@oko-wallet-api/testing/database";
import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { TEMP_ENC_SECRET } from "@oko-wallet-api/api/tss/utils";

const mockCheckKeyShareFromKSNodesV2 = jest.fn() as jest.Mock;

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

await jest.unstable_mockModule("@oko-wallet-api/api/tss/ks_node", () => ({
  checkKeyShareFromKSNodesV2: mockCheckKeyShareFromKSNodesV2,
}));

const { runKeygenV2, runKeygenEd25519 } = await import(
  "@oko-wallet-api/api/tss/v2/keygen"
);

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
      console.error(res);
      throw new Error("Failed to create ks nodes");
    }
    ksNodeIds.push(res.data.node_id);
  }

  return ksNodeIds;
}

describe("keygen_v2_test", () => {
  let pool: Pool;

  const sssThreshold = 2;

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
      sss_threshold: sssThreshold,
    });
    jest.clearAllMocks();
  });

  describe("runKeygenV2", () => {
    it("run keygenV2 success - creates both secp256k1 and ed25519 wallets", async () => {
      const secp256k1KeygenResult = napiRunKeygenClientCentralized();
      const ed25519KeygenResult = runKeygenCentralizedEd25519();

      const keygen_2_secp256k1 =
        secp256k1KeygenResult.keygen_outputs[Participant.P1];
      const keygen_2_ed25519 =
        ed25519KeygenResult.keygen_outputs[Participant.P1];

      const keygenRequest: KeygenRequestV2 = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2_secp256k1: {
          public_key: keygen_2_secp256k1.public_key,
          private_share: keygen_2_secp256k1.private_share,
        },
        keygen_2_ed25519: {
          key_package: keygen_2_ed25519.key_package,
          public_key_package: keygen_2_ed25519.public_key_package,
          identifier: [...keygen_2_ed25519.identifier],
          public_key: [...ed25519KeygenResult.public_key],
        },
      };

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const ksNodeIds = await setUpKSNodes(pool);
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          secp256k1: { nodeIds: ksNodeIds },
          ed25519: { nodeIds: ksNodeIds },
        },
      });

      const keygenResponse = await runKeygenV2(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === false) {
        console.error(keygenResponse);
        throw new Error("Failed to run keygenV2");
      }

      expect(keygenResponse.success).toBe(true);
      expect(keygenResponse.data).toBeDefined();
      expect(keygenResponse.data?.user.wallet_id_secp256k1).toBeDefined();
      expect(keygenResponse.data?.user.wallet_id_ed25519).toBeDefined();
      expect(keygenResponse.data?.user.public_key_secp256k1).toBeDefined();
      expect(keygenResponse.data?.user.public_key_ed25519).toBeDefined();

      // Verify secp256k1 wallet
      const secp256k1Wallet = await getWalletById(
        pool,
        keygenResponse.data?.user.wallet_id_secp256k1,
      );
      if (secp256k1Wallet.success === false) {
        console.error(secp256k1Wallet.err);
        throw new Error("Failed to get secp256k1 wallet");
      }
      expect(secp256k1Wallet.data).toBeDefined();
      expect(secp256k1Wallet.data?.wallet_id).toEqual(
        keygenResponse.data?.user.wallet_id_secp256k1,
      );
      expect(secp256k1Wallet.data?.curve_type).toEqual("secp256k1");
      expect(secp256k1Wallet.data?.public_key).toEqual(
        Buffer.from(keygen_2_secp256k1.public_key, "hex"),
      );
      const decryptedSecp256k1Share = decryptData(
        secp256k1Wallet.data?.enc_tss_share.toString("utf-8") as any,
        TEMP_ENC_SECRET,
      );
      expect(decryptedSecp256k1Share).toEqual(keygen_2_secp256k1.private_share);

      // Verify ed25519 wallet
      const ed25519Wallet = await getWalletById(
        pool,
        keygenResponse.data?.user.wallet_id_ed25519,
      );
      if (ed25519Wallet.success === false) {
        console.error(ed25519Wallet.err);
        throw new Error("Failed to get ed25519 wallet");
      }
      expect(ed25519Wallet.data).toBeDefined();
      expect(ed25519Wallet.data?.wallet_id).toEqual(
        keygenResponse.data?.user.wallet_id_ed25519,
      );
      expect(ed25519Wallet.data?.curve_type).toEqual("ed25519");
      expect(ed25519Wallet.data?.public_key).toEqual(
        Buffer.from(ed25519KeygenResult.public_key),
      );
      const decryptedEd25519Share = await decryptDataAsync(
        ed25519Wallet.data?.enc_tss_share.toString("utf-8") as any,
        TEMP_ENC_SECRET,
      );
      const ed25519SharesData = JSON.parse(decryptedEd25519Share);
      expect(ed25519SharesData).toHaveProperty("signing_share");
      expect(ed25519SharesData).toHaveProperty("verifying_share");
      expect(ed25519SharesData.signing_share).toHaveLength(32);
      expect(ed25519SharesData.verifying_share).toHaveLength(32);

      // Verify KS nodes for both wallets
      const secp256k1KSNodesRes = await getWalletKSNodesByWalletId(
        pool,
        keygenResponse.data?.user.wallet_id_secp256k1,
      );
      if (secp256k1KSNodesRes.success === false) {
        console.error(secp256k1KSNodesRes.err);
        throw new Error("Failed to get secp256k1 wallet KS nodes");
      }
      const secp256k1KSNodes = secp256k1KSNodesRes.data;
      expect(secp256k1KSNodes).toBeDefined();
      expect(secp256k1KSNodes?.length).toEqual(ksNodeIds.length);

      const ed25519KSNodesRes = await getWalletKSNodesByWalletId(
        pool,
        keygenResponse.data?.user.wallet_id_ed25519,
      );
      if (ed25519KSNodesRes.success === false) {
        console.error(ed25519KSNodesRes.err);
        throw new Error("Failed to get ed25519 wallet KS nodes");
      }
      const ed25519KSNodes = ed25519KSNodesRes.data;
      expect(ed25519KSNodes).toBeDefined();
      expect(ed25519KSNodes?.length).toEqual(ksNodeIds.length);
    });

    it("run keygenV2 failure - secp256k1 wallet already exists", async () => {
      const secp256k1KeygenResult = napiRunKeygenClientCentralized();
      const ed25519KeygenResult = runKeygenCentralizedEd25519();

      const createUserRes = await createUser(pool, "test@test.com", "google");
      if (createUserRes.success === false) {
        console.error(createUserRes.err);
        throw new Error("Failed to create user");
      }

      const publicKey =
        secp256k1KeygenResult.keygen_outputs[Participant.P1].public_key;
      await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from(publicKey, "hex"),
        enc_tss_share: Buffer.from(
          secp256k1KeygenResult.keygen_outputs[Participant.P1].private_share,
        ),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: sssThreshold,
      });

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const keygen_2_secp256k1 =
        secp256k1KeygenResult.keygen_outputs[Participant.P1];
      const keygen_2_ed25519 =
        ed25519KeygenResult.keygen_outputs[Participant.P1];

      const keygenRequest: KeygenRequestV2 = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2_secp256k1: {
          public_key: keygen_2_secp256k1.public_key,
          private_share: keygen_2_secp256k1.private_share,
        },
        keygen_2_ed25519: {
          key_package: keygen_2_ed25519.key_package,
          public_key_package: keygen_2_ed25519.public_key_package,
          identifier: [...keygen_2_ed25519.identifier],
          public_key: [...ed25519KeygenResult.public_key],
        },
      };

      const keygenResponse = await runKeygenV2(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === true) {
        throw new Error("keygenV2 should fail");
      }
      expect(keygenResponse.success).toEqual(false);
      expect(keygenResponse.code).toEqual("WALLET_ALREADY_EXISTS");
    });

    it("run keygenV2 failure - ed25519 wallet already exists", async () => {
      const secp256k1KeygenResult = napiRunKeygenClientCentralized();
      const ed25519KeygenResult = runKeygenCentralizedEd25519();

      const createUserRes = await createUser(pool, "test@test.com", "google");
      if (createUserRes.success === false) {
        console.error(createUserRes.err);
        throw new Error("Failed to create user");
      }

      const ed25519PublicKey = Buffer.from(ed25519KeygenResult.public_key);
      await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "ed25519",
        public_key: ed25519PublicKey,
        enc_tss_share: Buffer.from("test"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: sssThreshold,
      });

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const keygen_2_secp256k1 =
        secp256k1KeygenResult.keygen_outputs[Participant.P1];
      const keygen_2_ed25519 =
        ed25519KeygenResult.keygen_outputs[Participant.P1];

      const keygenRequest: KeygenRequestV2 = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2_secp256k1: {
          public_key: keygen_2_secp256k1.public_key,
          private_share: keygen_2_secp256k1.private_share,
        },
        keygen_2_ed25519: {
          key_package: keygen_2_ed25519.key_package,
          public_key_package: keygen_2_ed25519.public_key_package,
          identifier: [...keygen_2_ed25519.identifier],
          public_key: [...ed25519KeygenResult.public_key],
        },
      };

      const keygenResponse = await runKeygenV2(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === true) {
        throw new Error("keygenV2 should fail");
      }
      expect(keygenResponse.success).toEqual(false);
      expect(keygenResponse.code).toEqual("WALLET_ALREADY_EXISTS");
    });

    it("run keygenV2 failure - duplicate secp256k1 public key", async () => {
      const secp256k1KeygenResult = napiRunKeygenClientCentralized();
      const ed25519KeygenResult = runKeygenCentralizedEd25519();

      const publicKey =
        secp256k1KeygenResult.keygen_outputs[Participant.P1].public_key;
      await createWallet(pool, {
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        curve_type: "secp256k1",
        public_key: Buffer.from(publicKey, "hex"),
        enc_tss_share: Buffer.from(
          secp256k1KeygenResult.keygen_outputs[Participant.P1].private_share,
        ),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: sssThreshold,
      });

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const keygen_2_secp256k1 =
        secp256k1KeygenResult.keygen_outputs[Participant.P1];
      const keygen_2_ed25519 =
        ed25519KeygenResult.keygen_outputs[Participant.P1];

      const keygenRequest: KeygenRequestV2 = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2_secp256k1: {
          public_key: keygen_2_secp256k1.public_key,
          private_share: keygen_2_secp256k1.private_share,
        },
        keygen_2_ed25519: {
          key_package: keygen_2_ed25519.key_package,
          public_key_package: keygen_2_ed25519.public_key_package,
          identifier: [...keygen_2_ed25519.identifier],
          public_key: [...ed25519KeygenResult.public_key],
        },
      };

      const keygenResponse = await runKeygenV2(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === true) {
        throw new Error("keygenV2 should fail");
      }
      expect(keygenResponse.success).toEqual(false);
      expect(keygenResponse.code).toEqual("DUPLICATE_PUBLIC_KEY");
    });

    it("run keygenV2 failure - duplicate ed25519 public key", async () => {
      const secp256k1KeygenResult = napiRunKeygenClientCentralized();
      const ed25519KeygenResult = runKeygenCentralizedEd25519();

      const ed25519PublicKey = Buffer.from(ed25519KeygenResult.public_key);
      await createWallet(pool, {
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        curve_type: "ed25519",
        public_key: ed25519PublicKey,
        enc_tss_share: Buffer.from("test"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: sssThreshold,
      });

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const keygen_2_secp256k1 =
        secp256k1KeygenResult.keygen_outputs[Participant.P1];
      const keygen_2_ed25519 =
        ed25519KeygenResult.keygen_outputs[Participant.P1];

      const keygenRequest: KeygenRequestV2 = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2_secp256k1: {
          public_key: keygen_2_secp256k1.public_key,
          private_share: keygen_2_secp256k1.private_share,
        },
        keygen_2_ed25519: {
          key_package: keygen_2_ed25519.key_package,
          public_key_package: keygen_2_ed25519.public_key_package,
          identifier: [...keygen_2_ed25519.identifier],
          public_key: [...ed25519KeygenResult.public_key],
        },
      };

      const keygenResponse = await runKeygenV2(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === true) {
        throw new Error("keygenV2 should fail");
      }
      expect(keygenResponse.success).toEqual(false);
      expect(keygenResponse.code).toEqual("DUPLICATE_PUBLIC_KEY");
    });

    it("run keygenV2 failure - keyshare node insufficient for secp256k1", async () => {
      const secp256k1KeygenResult = napiRunKeygenClientCentralized();
      const ed25519KeygenResult = runKeygenCentralizedEd25519();

      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          secp256k1: { nodeIds: [] },
          ed25519: { nodeIds: ["node1", "node2"] },
        },
      });

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const keygen_2_secp256k1 =
        secp256k1KeygenResult.keygen_outputs[Participant.P1];
      const keygen_2_ed25519 =
        ed25519KeygenResult.keygen_outputs[Participant.P1];

      const keygenRequest: KeygenRequestV2 = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2_secp256k1: {
          public_key: keygen_2_secp256k1.public_key,
          private_share: keygen_2_secp256k1.private_share,
        },
        keygen_2_ed25519: {
          key_package: keygen_2_ed25519.key_package,
          public_key_package: keygen_2_ed25519.public_key_package,
          identifier: [...keygen_2_ed25519.identifier],
          public_key: [...ed25519KeygenResult.public_key],
        },
      };

      const keygenResponse = await runKeygenV2(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === true) {
        throw new Error("keygenV2 should fail");
      }
      expect(keygenResponse.success).toEqual(false);
      expect(keygenResponse.code).toEqual("KEYSHARE_NODE_INSUFFICIENT");
      expect(keygenResponse.msg).toContain("no active ks nodes for secp256k1");
    });

    it("run keygenV2 failure - keyshare node insufficient for ed25519", async () => {
      const secp256k1KeygenResult = napiRunKeygenClientCentralized();
      const ed25519KeygenResult = runKeygenCentralizedEd25519();

      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          secp256k1: { nodeIds: ["node1", "node2"] },
          ed25519: { nodeIds: [] },
        },
      });

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const keygen_2_secp256k1 =
        secp256k1KeygenResult.keygen_outputs[Participant.P1];
      const keygen_2_ed25519 =
        ed25519KeygenResult.keygen_outputs[Participant.P1];

      const keygenRequest: KeygenRequestV2 = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2_secp256k1: {
          public_key: keygen_2_secp256k1.public_key,
          private_share: keygen_2_secp256k1.private_share,
        },
        keygen_2_ed25519: {
          key_package: keygen_2_ed25519.key_package,
          public_key_package: keygen_2_ed25519.public_key_package,
          identifier: [...keygen_2_ed25519.identifier],
          public_key: [...ed25519KeygenResult.public_key],
        },
      };

      const keygenResponse = await runKeygenV2(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === true) {
        throw new Error("keygenV2 should fail");
      }
      expect(keygenResponse.success).toEqual(false);
      expect(keygenResponse.code).toEqual("KEYSHARE_NODE_INSUFFICIENT");
      expect(keygenResponse.msg).toContain("no active ks nodes for ed25519");
    });

    it("run keygenV2 failure - keyshare node check fails", async () => {
      const secp256k1KeygenResult = napiRunKeygenClientCentralized();
      const ed25519KeygenResult = runKeygenCentralizedEd25519();

      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: false,
        code: "KEYSHARE_NODE_INSUFFICIENT",
        msg: "keyshare node insufficient error",
      });

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const keygen_2_secp256k1 =
        secp256k1KeygenResult.keygen_outputs[Participant.P1];
      const keygen_2_ed25519 =
        ed25519KeygenResult.keygen_outputs[Participant.P1];

      const keygenRequest: KeygenRequestV2 = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2_secp256k1: {
          public_key: keygen_2_secp256k1.public_key,
          private_share: keygen_2_secp256k1.private_share,
        },
        keygen_2_ed25519: {
          key_package: keygen_2_ed25519.key_package,
          public_key_package: keygen_2_ed25519.public_key_package,
          identifier: [...keygen_2_ed25519.identifier],
          public_key: [...ed25519KeygenResult.public_key],
        },
      };

      const keygenResponse = await runKeygenV2(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === true) {
        throw new Error("keygenV2 should fail");
      }
      expect(keygenResponse.success).toEqual(false);
      expect(keygenResponse.code).toEqual("KEYSHARE_NODE_INSUFFICIENT");
      expect(keygenResponse.msg).toEqual("keyshare node insufficient error");
    });
  });

  describe("runKeygenEd25519", () => {
    const TEST_EMAIL_ED25519 = "keygen-ed25519-test@test.com";
    const TEST_JWT_CONFIG_ED25519 = {
      secret: "test-jwt-secret-for-keygen-ed25519",
      expires_in: "1h",
    };

    async function setUpUserWithSecp256k1Wallet(
      pool: Pool,
      userIdentifier: string = TEST_EMAIL_ED25519,
      authType: "google" | "auth0" = "google",
    ): Promise<string> {
      const createUserRes = await createUser(pool, userIdentifier, authType);
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      const secp256k1KeygenResult = napiRunKeygenClientCentralized();
      const secp256k1KeygenOutput =
        secp256k1KeygenResult.keygen_outputs[Participant.P1];

      const encryptedShare = await encryptDataAsync(
        secp256k1KeygenOutput.private_share,
        TEMP_ENC_SECRET,
      );
      const encryptedShareBuffer = Buffer.from(encryptedShare, "utf-8");

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from(secp256k1KeygenOutput.public_key, "hex"),
        enc_tss_share: encryptedShareBuffer,
        status: "ACTIVE" as WalletStatus,
        sss_threshold: sssThreshold,
      });
      if (createWalletRes.success === false) {
        throw new Error("Failed to create secp256k1 wallet");
      }

      return createUserRes.data.user_id;
    }

    function generateKeygenRequest(
      keygenResult: ReturnType<typeof runKeygenCentralizedEd25519>,
      user_identifier: string = TEST_EMAIL_ED25519,
    ): KeygenEd25519Request {
      const serverKeygenOutput = keygenResult.keygen_outputs[Participant.P1];
      return {
        auth_type: "google",
        user_identifier,
        keygen_2: {
          ...serverKeygenOutput,
          public_key: [...keygenResult.public_key],
        },
        email: user_identifier,
      };
    }

    it("should fail when user does not exist", async () => {
      const keygenResult = runKeygenCentralizedEd25519();
      const request = generateKeygenRequest(
        keygenResult,
        "nonexistent@test.com",
      );

      const result = await runKeygenEd25519(
        pool,
        TEST_JWT_CONFIG_ED25519,
        request,
        TEMP_ENC_SECRET,
        mockLogger,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("USER_NOT_FOUND");
      }
    });

    it("should fail when secp256k1 wallet does not exist", async () => {
      await setUpKSNodes(pool);

      // Create user but no secp256k1 wallet
      const createUserRes = await createUser(
        pool,
        TEST_EMAIL_ED25519,
        "google",
      );
      expect(createUserRes.success).toBe(true);

      const keygenResult = runKeygenCentralizedEd25519();
      const request = generateKeygenRequest(keygenResult);

      const result = await runKeygenEd25519(
        pool,
        TEST_JWT_CONFIG_ED25519,
        request,
        TEMP_ENC_SECRET,
        mockLogger,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("WALLET_NOT_FOUND");
      }
    });

    it("should create ed25519 wallet for existing user with secp256k1 wallet", async () => {
      await setUpUserWithSecp256k1Wallet(pool);

      const ksNodeIds = await setUpKSNodes(pool);
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          ed25519: { nodeIds: ksNodeIds },
        },
      });

      const keygenResult = runKeygenCentralizedEd25519();
      const request = generateKeygenRequest(keygenResult);

      const result = await runKeygenEd25519(
        pool,
        TEST_JWT_CONFIG_ED25519,
        request,
        TEMP_ENC_SECRET,
        mockLogger,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.email).toBe(TEST_EMAIL_ED25519);
        expect(result.data.user.wallet_id_secp256k1).toBeDefined();
        expect(result.data.user.wallet_id_ed25519).toBeDefined();
        expect(result.data.user.public_key_secp256k1).toBeDefined();
        expect(result.data.user.public_key_ed25519).toBeDefined();
      }
    });

    it("should fail if ed25519 wallet already exists for user", async () => {
      await setUpUserWithSecp256k1Wallet(pool);

      const ksNodeIds = await setUpKSNodes(pool);
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          ed25519: { nodeIds: ksNodeIds },
        },
      });

      const keygenResult = runKeygenCentralizedEd25519();

      // Create first ed25519 wallet
      const request1 = generateKeygenRequest(keygenResult);
      const result1 = await runKeygenEd25519(
        pool,
        TEST_JWT_CONFIG_ED25519,
        request1,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      expect(result1.success).toBe(true);

      // Try to create second ed25519 wallet with different keys
      const keygenResult2 = runKeygenCentralizedEd25519();
      const request2 = generateKeygenRequest(keygenResult2);
      const result2 = await runKeygenEd25519(
        pool,
        TEST_JWT_CONFIG_ED25519,
        request2,
        TEMP_ENC_SECRET,
        mockLogger,
      );

      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.code).toBe("WALLET_ALREADY_EXISTS");
      }
    });

    it("should fail if public key is duplicated", async () => {
      await setUpUserWithSecp256k1Wallet(pool, "user1@test.com");
      await setUpUserWithSecp256k1Wallet(pool, "user2@test.com");

      const ksNodeIds = await setUpKSNodes(pool);
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          ed25519: { nodeIds: ksNodeIds },
        },
      });

      const keygenResult = runKeygenCentralizedEd25519();

      // Create ed25519 wallet for first user
      const request1 = generateKeygenRequest(keygenResult, "user1@test.com");
      const result1 = await runKeygenEd25519(
        pool,
        TEST_JWT_CONFIG_ED25519,
        request1,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      expect(result1.success).toBe(true);

      // Try to create wallet with same public key for different user
      const request2 = generateKeygenRequest(keygenResult, "user2@test.com");
      const result2 = await runKeygenEd25519(
        pool,
        TEST_JWT_CONFIG_ED25519,
        request2,
        TEMP_ENC_SECRET,
        mockLogger,
      );

      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.code).toBe("DUPLICATE_PUBLIC_KEY");
      }
    });

    it("should include optional name in response when provided", async () => {
      await setUpUserWithSecp256k1Wallet(pool);

      const ksNodeIds = await setUpKSNodes(pool);
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          ed25519: { nodeIds: ksNodeIds },
        },
      });

      const keygenResult = runKeygenCentralizedEd25519();
      const serverKeygenOutput = keygenResult.keygen_outputs[Participant.P1];

      const request: KeygenEd25519Request = {
        auth_type: "google",
        user_identifier: TEST_EMAIL_ED25519,
        keygen_2: {
          ...serverKeygenOutput,
          public_key: [...keygenResult.public_key],
        },
        email: TEST_EMAIL_ED25519,
        name: "Test User",
      };

      const result = await runKeygenEd25519(
        pool,
        TEST_JWT_CONFIG_ED25519,
        request,
        TEMP_ENC_SECRET,
        mockLogger,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.name).toBe("Test User");
      }
    });

    it("should handle different auth types", async () => {
      const authTypes = ["google", "auth0"] as const;

      // Set up KS nodes once before the loop
      const ksNodeIds = await setUpKSNodes(pool);
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          ed25519: { nodeIds: ksNodeIds },
        },
      });

      for (let i = 0; i < authTypes.length; i++) {
        await setUpUserWithSecp256k1Wallet(
          pool,
          `authtype-test-${i}@test.com`,
          authTypes[i],
        );

        const keygenResult = runKeygenCentralizedEd25519();
        const serverKeygenOutput = keygenResult.keygen_outputs[Participant.P1];

        const request: KeygenEd25519Request = {
          auth_type: authTypes[i],
          user_identifier: `authtype-test-${i}@test.com`,
          keygen_2: {
            ...serverKeygenOutput,
            public_key: [...keygenResult.public_key],
          },
          email: `authtype-test-${i}@test.com`,
        };

        const result = await runKeygenEd25519(
          pool,
          TEST_JWT_CONFIG_ED25519,
          request,
          TEMP_ENC_SECRET,
          mockLogger,
        );

        if (result.success === false) {
          console.error(`Keygen failed for ${authTypes[i]}:`, {
            code: result.code,
            msg: result.msg,
          });
        }
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.user.email).toBe(`authtype-test-${i}@test.com`);
        }
      }
    });

    it("should generate valid JWT token", async () => {
      await setUpUserWithSecp256k1Wallet(pool);

      const ksNodeIds = await setUpKSNodes(pool);
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          ed25519: { nodeIds: ksNodeIds },
        },
      });

      const keygenResult = runKeygenCentralizedEd25519();
      const request = generateKeygenRequest(keygenResult);

      const result = await runKeygenEd25519(
        pool,
        TEST_JWT_CONFIG_ED25519,
        request,
        TEMP_ENC_SECRET,
        mockLogger,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // JWT format: header.payload.signature
        const tokenParts = result.data.token.split(".");
        expect(tokenParts.length).toBe(3);
      }
    });

    it("should fail when no KS nodes available", async () => {
      await setUpUserWithSecp256k1Wallet(pool);

      // Don't set up KS nodes
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          ed25519: { nodeIds: [] },
        },
      });

      const keygenResult = runKeygenCentralizedEd25519();
      const request = generateKeygenRequest(keygenResult);

      const result = await runKeygenEd25519(
        pool,
        TEST_JWT_CONFIG_ED25519,
        request,
        TEMP_ENC_SECRET,
        mockLogger,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("KEYSHARE_NODE_INSUFFICIENT");
      }
    });

    it("should store only signing_share and verifying_share in enc_tss_share", async () => {
      await setUpUserWithSecp256k1Wallet(pool);

      const ksNodeIds = await setUpKSNodes(pool);
      (mockCheckKeyShareFromKSNodesV2 as any).mockResolvedValue({
        success: true,
        data: {
          ed25519: { nodeIds: ksNodeIds },
        },
      });

      const keygenResult = runKeygenCentralizedEd25519();
      const serverKeygenOutput = keygenResult.keygen_outputs[Participant.P1];

      // Extract expected shares from server key_package
      const expectedShares = extractKeyPackageSharesEd25519(
        new Uint8Array(serverKeygenOutput.key_package),
      );

      const request = generateKeygenRequest(keygenResult);

      const result = await runKeygenEd25519(
        pool,
        TEST_JWT_CONFIG_ED25519,
        request,
        TEMP_ENC_SECRET,
        mockLogger,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Get wallet from database using wallet_id_ed25519 from result
        const getWalletRes = await getWalletById(
          pool,
          result.data.user.wallet_id_ed25519,
        );
        expect(getWalletRes.success).toBe(true);
        if (getWalletRes.success && getWalletRes.data) {
          const ed25519Wallet = getWalletRes.data;

          // Verify it's an ed25519 wallet
          expect(ed25519Wallet.curve_type).toBe("ed25519");
          expect(ed25519Wallet.wallet_id).toBe(
            result.data.user.wallet_id_ed25519,
          );

          // Decrypt enc_tss_share
          const encryptedShare = ed25519Wallet.enc_tss_share.toString("utf-8");
          const decryptedShare = await decryptDataAsync(
            encryptedShare,
            TEMP_ENC_SECRET,
          );
          const storedShares = JSON.parse(decryptedShare) as {
            signing_share: number[];
            verifying_share: number[];
          };

          // Verify structure: should only have signing_share and verifying_share
          expect(storedShares).toHaveProperty("signing_share");
          expect(storedShares).toHaveProperty("verifying_share");
          expect(storedShares).not.toHaveProperty("key_package");
          expect(storedShares).not.toHaveProperty("public_key_package");
          expect(storedShares).not.toHaveProperty("identifier");

          // Verify sizes: each should be 32 bytes
          expect(storedShares.signing_share).toHaveLength(32);
          expect(storedShares.verifying_share).toHaveLength(32);

          // Verify values match expected shares
          expect(storedShares.signing_share).toEqual(
            expectedShares.signing_share,
          );
          expect(storedShares.verifying_share).toEqual(
            expectedShares.verifying_share,
          );
        }
      }
    });
  });
});
