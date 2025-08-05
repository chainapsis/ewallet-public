import { Pool } from "pg";
import {
  createUser,
  createWallet,
  getKeyShareByWalletId,
  getUserByEmail,
  getWalletByPublicKey,
} from "@keplr-ewallet/credential-vault-pg-interface";

import {
  createPgDatabase,
  resetPgDatabase,
} from "@keplr-ewallet-cv-server/database";
import { testPgConfig } from "../../database/test_config";
import { getKeyShare, registerKeyShare } from ".";

describe("key_share_test", () => {
  let pool: Pool;

  beforeAll(async () => {
    const config = testPgConfig;
    const createPostgresRes = await createPgDatabase({
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
  });

  describe("register key share", () => {
    it("register key share success", async () => {
      const publicKey = "3fa1c7e8b42d9f50c6e2a8749db1fe23";
      const encShare = "8c5e2d17ab9034f65d1c3b7a29ef4d88";

      const registerKeyShareRes = await registerKeyShare(pool, {
        email: "test@test.com",
        curve_type: "secp256k1",
        public_key: publicKey,
        enc_share: encShare,
      });

      console.log("registerKeyShareRes", registerKeyShareRes);

      expect(registerKeyShareRes.success).toBe(true);
      if (registerKeyShareRes.success === false) {
        console.error(registerKeyShareRes.err);
        throw new Error("Failed to register key share");
      }

      const getUserRes = await getUserByEmail(pool, "test@test.com");
      if (getUserRes.success === false) {
        console.error(getUserRes.err);
        throw new Error("Failed to get user");
      }

      expect(getUserRes.data).toBeDefined();
      expect(getUserRes.data?.user_id).toBeDefined();

      const getWalletRes = await getWalletByPublicKey(
        pool,
        Buffer.from(publicKey, "hex"),
      );
      if (getWalletRes.success === false) {
        console.error(getWalletRes.err);
        throw new Error("Failed to get wallet");
      }

      expect(getWalletRes.data).toBeDefined();
      expect(getWalletRes.data?.wallet_id).toBeDefined();

      const getKeyShareRes = await getKeyShareByWalletId(
        pool,
        getWalletRes.data!.wallet_id,
      );
      if (getKeyShareRes.success === false) {
        console.error(getKeyShareRes.err);
        throw new Error("Failed to get key share");
      }

      expect(getKeyShareRes.data).toBeDefined();
      expect(getKeyShareRes.data?.share_id).toBeDefined();
      expect(getKeyShareRes.data?.enc_share).toEqual(
        Buffer.from(encShare, "hex"),
      );
    });

    it("register key share failure - duplicate public key", async () => {
      const publicKey = "3fa1c7e8b42d9f50c6e2a8749db1fe23";
      const encShare = "8c5e2d17ab9034f65d1c3b7a29ef4d88";

      await createWallet(pool, {
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        curve_type: "secp256k1",
        public_key: Buffer.from(publicKey, "hex"),
      });

      const registerKeyShareRes = await registerKeyShare(pool, {
        email: "test@test.com",
        curve_type: "secp256k1",
        public_key: publicKey,
        enc_share: encShare,
      });

      if (registerKeyShareRes.success === true) {
        throw new Error("register key share should fail");
      }

      expect(registerKeyShareRes.success).toBe(false);
      expect(registerKeyShareRes.err.code).toBe("DUPLICATE_PUBLIC_KEY");
      expect(registerKeyShareRes.err.message).toBe("Duplicate public key");
    });
  });

  describe("get key share", () => {
    it("get key share success", async () => {
      const email = "test@test.com";
      const publicKey = "3fa1c7e8b42d9f50c6e2a8749db1fe23";
      const encShare = "8c5e2d17ab9034f65d1c3b7a29ef4d88";

      await registerKeyShare(pool, {
        email,
        curve_type: "secp256k1",
        public_key: publicKey,
        enc_share: encShare,
      });

      const getKeyShareRes = await getKeyShare(pool, {
        email,
        public_key: publicKey,
      });

      if (getKeyShareRes.success === false) {
        console.error(getKeyShareRes.err);
        throw new Error("Failed to get key share");
      }

      expect(getKeyShareRes.data).toBeDefined();
      expect(getKeyShareRes.data?.share_id).toBeDefined();
      expect(getKeyShareRes.data?.enc_share).toEqual(encShare);
    });

    it("get key share failure - user not found", async () => {
      const email = "test@test.com";
      const publicKey = "3fa1c7e8b42d9f50c6e2a8749db1fe23";
      const encShare = "8c5e2d17ab9034f65d1c3b7a29ef4d88";

      await registerKeyShare(pool, {
        email: "test2@test.com",
        curve_type: "secp256k1",
        public_key: publicKey,
        enc_share: encShare,
      });

      const getKeyShareRes = await getKeyShare(pool, {
        email,
        public_key: publicKey,
      });

      expect(getKeyShareRes.success).toBe(false);
      if (getKeyShareRes.success === true) {
        throw new Error("get key share should fail");
      }
      expect(getKeyShareRes.err.code).toBe("USER_NOT_FOUND");
      expect(getKeyShareRes.err.message).toBe("User not found");
    });

    it("get key share failure - wallet not found", async () => {
      const email = "test@test.com";
      const publicKey = "3fa1c7e8b42d9f50c6e2a8749db1fe23";
      const encShare = "8c5e2d17ab9034f65d1c3b7a29ef4d88";

      await registerKeyShare(pool, {
        email,
        curve_type: "secp256k1",
        public_key: "d4b17e2a0c98f1e3b56a47c908ab5f12",
        enc_share: encShare,
      });

      const getKeyShareRes = await getKeyShare(pool, {
        email,
        public_key: publicKey,
      });

      expect(getKeyShareRes.success).toBe(false);
      if (getKeyShareRes.success === true) {
        throw new Error("get key share should fail");
      }
      expect(getKeyShareRes.err.code).toBe("WALLET_NOT_FOUND");
      expect(getKeyShareRes.err.message).toBe("Wallet not found");
    });

    it("get key share failure - unauthorized", async () => {
      const email = "test@test.com";
      const publicKey = "3fa1c7e8b42d9f50c6e2a8749db1fe23";

      await createUser(pool, email);

      await createWallet(pool, {
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        curve_type: "secp256k1",
        public_key: Buffer.from(publicKey, "hex"),
      });

      const getKeyShareRes = await getKeyShare(pool, {
        email,
        public_key: publicKey,
      });

      expect(getKeyShareRes.success).toBe(false);
      if (getKeyShareRes.success === true) {
        throw new Error("get key share should fail");
      }
      expect(getKeyShareRes.err.code).toBe("UNAUTHORIZED");
      expect(getKeyShareRes.err.message).toBe("Unauthorized");
    });

    it("get key share failure - key share not found", async () => {
      const email = "test@test.com";
      const publicKey = "3fa1c7e8b42d9f50c6e2a8749db1fe23";

      const createUserRes = await createUser(pool, email);
      if (createUserRes.success === false) {
        console.error(createUserRes.err);
        throw new Error("Failed to create user");
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data!.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from(publicKey, "hex"),
      });
      if (createWalletRes.success === false) {
        console.error(createWalletRes.err);
        throw new Error("Failed to create wallet");
      }

      const getKeyShareRes = await getKeyShare(pool, {
        email,
        public_key: publicKey,
      });

      expect(getKeyShareRes.success).toBe(false);
      if (getKeyShareRes.success === true) {
        throw new Error("get key share should fail");
      }
      expect(getKeyShareRes.err.code).toBe("KEY_SHARE_NOT_FOUND");
      expect(getKeyShareRes.err.message).toBe("Key share not found");
    });
  });
});
