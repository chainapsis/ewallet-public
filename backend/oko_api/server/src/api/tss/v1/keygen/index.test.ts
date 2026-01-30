import { jest } from "@jest/globals";
import { Pool } from "pg";
import type { Logger } from "winston";
import type { WalletStatus } from "@oko-wallet/oko-types/wallets";
import {
  type KeygenRequest,
  type WalletKSNodeWithNodeNameAndServerUrl,
} from "@oko-wallet/oko-types/tss";
import { Participant } from "@oko-wallet/tecdsa-interface";
import { napiRunKeygenClientCentralized } from "@oko-wallet/cait-sith-keplr-addon/addon";
import {
  insertKSNode,
  getWalletKSNodesByWalletId,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import { decryptData } from "@oko-wallet/crypto-js/node";
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

const mockCheckKeyShareFromKSNodes = jest.fn() as jest.Mock;

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

await jest.unstable_mockModule("@oko-wallet-api/api/tss/ks_node", () => ({
  checkKeyShareFromKSNodes: mockCheckKeyShareFromKSNodes,
}));

const { runKeygen } = await import("@oko-wallet-api/api/tss/v1/keygen");

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

describe("keygen_v1_test", () => {
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

  describe("runKeygenV1", () => {
    it("run keygen success", async () => {
      const clientKeygenResult = napiRunKeygenClientCentralized();
      const { keygen_outputs } = clientKeygenResult;

      const keygen_2 = keygen_outputs[Participant.P1];

      const keygenRequest: KeygenRequest = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2,
      };

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const ksNodeIds = await setUpKSNodes(pool);
      (mockCheckKeyShareFromKSNodes as any).mockResolvedValue({
        success: true,
        data: {
          nodeIds: ksNodeIds,
        },
      });

      const keygenResponse = await runKeygen(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === false) {
        console.error(keygenResponse);
        throw new Error("Failed to run keygen");
      }

      expect(keygenResponse.success).toBe(true);
      expect(keygenResponse.data).toBeDefined();
      expect(keygenResponse.data?.user.wallet_id).toBeDefined();

      const wallet = await getWalletById(
        pool,
        keygenResponse.data?.user.wallet_id,
      );
      if (wallet.success === false) {
        console.error(wallet.err);
        throw new Error("Failed to get wallet");
      }

      expect(wallet.data).toBeDefined();
      expect(wallet.data?.wallet_id).toEqual(
        keygenResponse.data?.user.wallet_id,
      );
      expect(wallet.data?.curve_type).toEqual("secp256k1");
      expect(wallet.data?.public_key).toEqual(
        Buffer.from(keygen_2.public_key, "hex"),
      );
      const decryptedShare = decryptData(
        wallet.data?.enc_tss_share.toString("utf-8") as any,
        TEMP_ENC_SECRET,
      );
      expect(decryptedShare).toEqual(keygen_2.private_share);

      const walletKSNodes = await getWalletKSNodesByWalletId(
        pool,
        keygenResponse.data?.user.wallet_id,
      );
      if (walletKSNodes.success === false) {
        console.error(walletKSNodes.err);
        throw new Error("Failed to get wallet ks nodes");
      }
      expect(walletKSNodes.data).toBeDefined();
      expect(walletKSNodes.data?.length).toEqual(ksNodeIds.length);
      expect(
        walletKSNodes.data?.every(
          (ksNode: WalletKSNodeWithNodeNameAndServerUrl) =>
            ksNodeIds.includes(ksNode.node_id),
        ),
      ).toBe(true);
      const endpoints = ["http://test.com/ksNode1", "http://test.com/ksNode2"];
      expect(
        walletKSNodes.data?.every(
          (ksNode: WalletKSNodeWithNodeNameAndServerUrl) =>
            endpoints.includes(ksNode.server_url),
        ),
      ).toBe(true);
    });

    it("run keygen failure - wallet already exists", async () => {
      const clientKeygenResult = napiRunKeygenClientCentralized();
      const { keygen_outputs } = clientKeygenResult;

      const createUserRes = await createUser(pool, "test@test.com", "google");
      if (createUserRes.success === false) {
        console.error(createUserRes.err);
        throw new Error("Failed to create user");
      }

      const publicKey = keygen_outputs[Participant.P1].public_key;
      await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from(publicKey, "hex"),
        enc_tss_share: Buffer.from(
          keygen_outputs[Participant.P1].private_share,
        ),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: sssThreshold,
      });

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const keygenRequest: KeygenRequest = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2: {
          public_key: keygen_outputs[Participant.P1].public_key,
          private_share: keygen_outputs[Participant.P1].private_share,
        },
      };

      const keygenResponse = await runKeygen(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === true) {
        throw new Error("keygen should fail");
      }
      expect(keygenResponse.success).toEqual(false);
      expect(keygenResponse.code).toEqual("WALLET_ALREADY_EXISTS");
    });

    it("run keygen failure - duplicate public key", async () => {
      const clientKeygenResult = napiRunKeygenClientCentralized();
      const { keygen_outputs } = clientKeygenResult;

      const publicKey = keygen_outputs[Participant.P1].public_key;
      await createWallet(pool, {
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        curve_type: "secp256k1",
        public_key: Buffer.from(publicKey, "hex"),
        enc_tss_share: Buffer.from(
          keygen_outputs[Participant.P1].private_share,
        ),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: sssThreshold,
      });

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const keygenRequest: KeygenRequest = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2: {
          public_key: keygen_outputs[Participant.P1].public_key,
          private_share: keygen_outputs[Participant.P1].private_share,
        },
      };

      const keygenResponse = await runKeygen(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === true) {
        throw new Error("keygen should fail");
      }
      expect(keygenResponse.success).toEqual(false);
      expect(keygenResponse.code).toEqual("DUPLICATE_PUBLIC_KEY");
    });

    it("run keygen failure - keyshare node insufficient", async () => {
      const clientKeygenResult = napiRunKeygenClientCentralized();
      const { keygen_outputs } = clientKeygenResult;

      (mockCheckKeyShareFromKSNodes as any).mockResolvedValue({
        success: false,
        code: "KEYSHARE_NODE_INSUFFICIENT",
        msg: "keyshare node insufficient error",
      });

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const keygenRequest: KeygenRequest = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2: {
          public_key: keygen_outputs[Participant.P1].public_key,
          private_share: keygen_outputs[Participant.P1].private_share,
        },
      };

      const keygenResponse = await runKeygen(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === true) {
        throw new Error("keygen should fail");
      }
      expect(keygenResponse.success).toEqual(false);
      expect(keygenResponse.code).toEqual("KEYSHARE_NODE_INSUFFICIENT");
      expect(keygenResponse.msg).toEqual("keyshare node insufficient error");
    });

    it("run keygen failure - keyshare node insufficient - no active ks nodes", async () => {
      const clientKeygenResult = napiRunKeygenClientCentralized();
      const { keygen_outputs } = clientKeygenResult;

      (mockCheckKeyShareFromKSNodes as any).mockResolvedValue({
        success: true,
        data: {
          nodeIds: [],
        },
      });

      const jwtConfig = {
        secret: "test-jwt-secret",
        expires_in: "1h",
      };

      const keygenRequest: KeygenRequest = {
        auth_type: "google",
        user_identifier: "test@test.com",
        email: "test@test.com",
        keygen_2: {
          public_key: keygen_outputs[Participant.P1].public_key,
          private_share: keygen_outputs[Participant.P1].private_share,
        },
      };

      const keygenResponse = await runKeygen(
        pool,
        jwtConfig,
        keygenRequest,
        TEMP_ENC_SECRET,
        mockLogger,
      );
      if (keygenResponse.success === true) {
        throw new Error("keygen should fail");
      }
      expect(keygenResponse.success).toEqual(false);
      expect(keygenResponse.code).toEqual("KEYSHARE_NODE_INSUFFICIENT");
      expect(keygenResponse.msg).toEqual("no active ks nodes");
    });
  });
});
