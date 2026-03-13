import { Bytes, type Bytes33, type Bytes64 } from "@oko-wallet/bytes";
import {
  createKeyShare,
  createUser,
  createWallet,
  getKeyShareByWalletId,
  getUserByAuthTypeAndUserAuthId,
  getWalletByPublicKey,
} from "@oko-wallet/ksn-pg-interface";
import type { Pool } from "pg";

import {
  checkKeyShare,
  getKeyShare,
  registerKeyShare,
} from "@oko-wallet-ksn-server/api/key_share";
import { connectPG, resetPgDatabase } from "@oko-wallet-ksn-server/database";
import { testPgConfig } from "@oko-wallet-ksn-server/database/test_config";
import { decryptDataAsync } from "@oko-wallet-ksn-server/encrypt";

const TEST_ENC_SECRET = "test_enc_secret";

describe("key_share_v1_test", () => {
  let pool: Pool;

  beforeAll(async () => {
    const config = testPgConfig;
    const createPostgresRes = await connectPG({
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

  describe("register key share", () => {
    it("register key share success", async () => {
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";

      const shareArr = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 256),
      );
      const shareRes = Bytes.fromUint8Array(new Uint8Array(shareArr), 64);
      if (shareRes.success === false) {
        console.error(shareRes.err);
        throw new Error("Failed to get share bytes");
      }
      const share: Bytes64 = shareRes.data;

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }

      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      const registerKeyShareRes = await registerKeyShare(
        pool,
        {
          user_auth_id: "test@test.com",
          auth_type: "google",
          curve_type: "secp256k1",
          public_key: publicKeyBytes,
          share,
        },
        TEST_ENC_SECRET,
      );

      expect(registerKeyShareRes.success).toBe(true);
      if (registerKeyShareRes.success === false) {
        console.error(registerKeyShareRes.msg);
        throw new Error("Failed to register key share");
      }

      const getUserRes = await getUserByAuthTypeAndUserAuthId(
        pool,
        "google",
        "test@test.com",
      );
      if (getUserRes.success === false) {
        console.error(getUserRes.err);
        throw new Error("Failed to get user");
      }

      expect(getUserRes.data).toBeDefined();
      expect(getUserRes.data?.user_id).toBeDefined();

      const getWalletRes = await getWalletByPublicKey(pool, publicKeyBytes);
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

      const decryptedShare = await decryptDataAsync(
        getKeyShareRes.data!.enc_share.toString("utf-8"),
        TEST_ENC_SECRET,
      );

      expect(getKeyShareRes.data).toBeDefined();
      expect(getKeyShareRes.data?.share_id).toBeDefined();
      expect(decryptedShare).toEqual(share.toHex());
    });

    it("register key share failure - duplicate public key", async () => {
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";
      const shareArr = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 256),
      );
      const shareRes = Bytes.fromUint8Array(new Uint8Array(shareArr), 64);
      if (shareRes.success === false) {
        console.error(shareRes.err);
        throw new Error("Failed to get share bytes");
      }
      const share: Bytes64 = shareRes.data;

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }

      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      await createWallet(pool, {
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        curve_type: "secp256k1",
        public_key: publicKeyBytes.toUint8Array(),
      });

      const registerKeyShareRes = await registerKeyShare(
        pool,
        {
          user_auth_id: "test@test.com",
          auth_type: "google",
          curve_type: "secp256k1",
          public_key: publicKeyBytes,
          share,
        },
        TEST_ENC_SECRET,
      );

      if (registerKeyShareRes.success === true) {
        throw new Error("register key share should fail");
      }

      expect(registerKeyShareRes.success).toBe(false);
      expect(registerKeyShareRes.code).toBe("DUPLICATE_PUBLIC_KEY");
      expect(registerKeyShareRes.msg).toContain("Duplicate public key");
    });
  });

  describe("get key share", () => {
    it("get key share success", async () => {
      const email = "test@test.com";
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";
      const shareArr = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 256),
      );
      const shareRes = Bytes.fromUint8Array(new Uint8Array(shareArr), 64);
      if (shareRes.success === false) {
        console.error(shareRes.err);
        throw new Error("Failed to get share bytes");
      }
      const share: Bytes64 = shareRes.data;

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }

      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      await registerKeyShare(
        pool,
        {
          user_auth_id: email,
          auth_type: "google",
          curve_type: "secp256k1",
          public_key: publicKeyBytes,
          share,
        },
        TEST_ENC_SECRET,
      );

      const getKeyShareRes = await getKeyShare(
        pool,
        {
          user_auth_id: email,
          auth_type: "google",
          curve_type: "secp256k1",
          public_key: publicKeyBytes,
        },
        TEST_ENC_SECRET,
      );

      if (getKeyShareRes.success === false) {
        console.error(getKeyShareRes.msg);
        throw new Error("Failed to get key share");
      }

      expect(getKeyShareRes.data).toBeDefined();
      expect(getKeyShareRes.data?.share_id).toBeDefined();
      expect(getKeyShareRes.data?.share).toEqual(share.toHex());
    });

    it("get key share failure - user not found", async () => {
      const email = "test@test.com";
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";
      const shareArr = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 256),
      );
      const shareRes = Bytes.fromUint8Array(new Uint8Array(shareArr), 64);
      if (shareRes.success === false) {
        console.error(shareRes.err);
        throw new Error("Failed to get share bytes");
      }
      const share: Bytes64 = shareRes.data;

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }

      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      await registerKeyShare(
        pool,
        {
          user_auth_id: "test2@test.com",
          auth_type: "google",
          curve_type: "secp256k1",
          public_key: publicKeyBytes,
          share,
        },
        TEST_ENC_SECRET,
      );

      const getKeyShareRes = await getKeyShare(
        pool,
        {
          user_auth_id: email,
          auth_type: "google",
          curve_type: "secp256k1",
          public_key: publicKeyBytes,
        },
        TEST_ENC_SECRET,
      );

      expect(getKeyShareRes.success).toBe(false);
      if (getKeyShareRes.success === true) {
        throw new Error("get key share should fail");
      }
      expect(getKeyShareRes.code).toBe("USER_NOT_FOUND");
      expect(getKeyShareRes.msg).toContain("User not found");
    });

    it("get key share failure - wallet not found", async () => {
      const email = "test@test.com";
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";
      const publicKey2 =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC5600";
      const shareArr = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 256),
      );
      const shareRes = Bytes.fromUint8Array(new Uint8Array(shareArr), 64);
      if (shareRes.success === false) {
        console.error(shareRes.err);
        throw new Error("Failed to get share bytes");
      }
      const share: Bytes64 = shareRes.data;

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }
      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      const publicKeyBytes2Res = Bytes.fromHexString(publicKey2, 33);
      if (publicKeyBytes2Res.success === false) {
        console.error(publicKeyBytes2Res.err);
        throw new Error("Failed to get public key bytes");
      }
      const publicKeyBytes2: Bytes33 = publicKeyBytes2Res.data;

      const createUserRes = await createUser(pool, "google", email);
      if (createUserRes.success === false) {
        console.error(createUserRes.err);
        throw new Error("Failed to create user");
      }

      await registerKeyShare(
        pool,
        {
          user_auth_id: email,
          auth_type: "google",
          curve_type: "secp256k1",
          public_key: publicKeyBytes2,
          share,
        },
        TEST_ENC_SECRET,
      );

      const getKeyShareRes = await getKeyShare(
        pool,
        {
          user_auth_id: email,
          auth_type: "google",
          curve_type: "secp256k1",
          public_key: publicKeyBytes,
        },
        TEST_ENC_SECRET,
      );

      expect(getKeyShareRes.success).toBe(false);
      if (getKeyShareRes.success === true) {
        throw new Error("get key share should fail");
      }
      expect(getKeyShareRes.code).toBe("WALLET_NOT_FOUND");
      expect(getKeyShareRes.msg).toContain("Wallet not found");
    });

    it("get key share failure - unauthorized", async () => {
      const email = "test@test.com";
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }
      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      await createUser(pool, "google", email);

      await createWallet(pool, {
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        curve_type: "secp256k1",
        public_key: publicKeyBytes.toUint8Array(),
      });

      const getKeyShareRes = await getKeyShare(
        pool,
        {
          user_auth_id: email,
          auth_type: "google",
          curve_type: "secp256k1",
          public_key: publicKeyBytes,
        },
        TEST_ENC_SECRET,
      );

      expect(getKeyShareRes.success).toBe(false);
      if (getKeyShareRes.success === true) {
        throw new Error("get key share should fail");
      }
      expect(getKeyShareRes.code).toBe("UNAUTHORIZED");
      expect(getKeyShareRes.msg).toContain("Unauthorized");
    });

    it("get key share failure - key share not found", async () => {
      const email = "test@test.com";
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }
      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      const createUserRes = await createUser(pool, "google", email);
      if (createUserRes.success === false) {
        console.error(createUserRes.err);
        throw new Error("Failed to create user");
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data!.user_id,
        curve_type: "secp256k1",
        public_key: publicKeyBytes.toUint8Array(),
      });
      if (createWalletRes.success === false) {
        console.error(createWalletRes.err);
        throw new Error("Failed to create wallet");
      }

      const getKeyShareRes = await getKeyShare(
        pool,
        {
          user_auth_id: email,
          auth_type: "google",
          public_key: publicKeyBytes,
          curve_type: "secp256k1",
        },
        TEST_ENC_SECRET,
      );

      expect(getKeyShareRes.success).toBe(false);
      if (getKeyShareRes.success === true) {
        throw new Error("get key share should fail");
      }
      expect(getKeyShareRes.code).toBe("KEY_SHARE_NOT_FOUND");
      expect(getKeyShareRes.msg).toBe("Key share not found");
    });
  });

  describe("check key share", () => {
    it("should return true if key share exists", async () => {
      const email = "test@test.com";
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";
      const encShare = "8c5e2d17ab9034f65d1c3b7a29ef4d88";

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }
      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      const createUserRes = await createUser(pool, "google", email);
      if (createUserRes.success === false) {
        console.error(createUserRes.err);
        throw new Error("Failed to create user");
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data!.user_id,
        curve_type: "secp256k1",
        public_key: publicKeyBytes.toUint8Array(),
      });
      if (createWalletRes.success === false) {
        console.error(createWalletRes.err);
        throw new Error("Failed to create wallet");
      }

      const createKeyShareRes = await createKeyShare(pool, {
        wallet_id: createWalletRes.data!.wallet_id,
        enc_share: Buffer.from(encShare, "hex"),
      });
      if (createKeyShareRes.success === false) {
        console.error(createKeyShareRes.err);
        throw new Error("Failed to create key share");
      }

      const checkKeyShareRes = await checkKeyShare(pool, {
        user_auth_id: email,
        auth_type: "google",
        public_key: publicKeyBytes,
        curve_type: "secp256k1",
      });
      if (checkKeyShareRes.success === false) {
        console.error(checkKeyShareRes.msg);
        throw new Error("Failed to check key share");
      }

      expect(checkKeyShareRes.success).toBe(true);
      expect(checkKeyShareRes.data?.exists).toBe(true);
    });

    it("should return false if user not found", async () => {
      const email = "test@test.com";
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }
      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      const checkKeyShareRes = await checkKeyShare(pool, {
        user_auth_id: email,
        auth_type: "google",
        public_key: publicKeyBytes,
        curve_type: "secp256k1",
      });
      if (checkKeyShareRes.success === false) {
        console.error(checkKeyShareRes.msg);
        throw new Error("Failed to check key share");
      }

      expect(checkKeyShareRes.success).toBe(true);
      expect(checkKeyShareRes.data?.exists).toBe(false);
    });

    it("should return false if wallet not found", async () => {
      const email = "test@test.com";
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }
      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      const createUserRes = await createUser(pool, "google", email);
      if (createUserRes.success === false) {
        console.error(createUserRes.err);
        throw new Error("Failed to create user");
      }

      const checkKeyShareRes = await checkKeyShare(pool, {
        user_auth_id: email,
        auth_type: "google",
        public_key: publicKeyBytes,
        curve_type: "secp256k1",
      });
      if (checkKeyShareRes.success === false) {
        console.error(checkKeyShareRes.msg);
        throw new Error("Failed to check key share");
      }

      expect(checkKeyShareRes.success).toBe(true);
      expect(checkKeyShareRes.data?.exists).toBe(false);
    });

    it("should fail if public key is not valid", async () => {
      const email = "test@test.com";
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }
      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      const createUserRes = await createUser(pool, "google", email);
      if (createUserRes.success === false) {
        console.error(createUserRes.err);
        throw new Error("Failed to create user");
      }

      const createWalletRes = await createWallet(pool, {
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        curve_type: "secp256k1",
        public_key: publicKeyBytes.toUint8Array(),
      });
      if (createWalletRes.success === false) {
        console.error(createWalletRes.err);
        throw new Error("Failed to create wallet");
      }

      const checkKeyShareRes = await checkKeyShare(pool, {
        user_auth_id: email,
        auth_type: "google",
        public_key: publicKeyBytes,
        curve_type: "secp256k1",
      });
      if (checkKeyShareRes.success === true) {
        throw new Error("check key share should fail");
      }

      expect(checkKeyShareRes.success).toBe(false);
      expect(checkKeyShareRes.code).toBe("PUBLIC_KEY_INVALID");
      expect(checkKeyShareRes.msg).toBe("Public key is not valid");
    });

    it("should return false if key share not found", async () => {
      const email = "test@test.com";
      const publicKey =
        "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";

      const publicKeyBytesRes = Bytes.fromHexString(publicKey, 33);
      if (publicKeyBytesRes.success === false) {
        console.error(publicKeyBytesRes.err);
        throw new Error("Failed to get public key bytes");
      }
      const publicKeyBytes: Bytes33 = publicKeyBytesRes.data;

      const createUserRes = await createUser(pool, "google", email);
      if (createUserRes.success === false) {
        console.error(createUserRes.err);
        throw new Error("Failed to create user");
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data!.user_id,
        curve_type: "secp256k1",
        public_key: publicKeyBytes.toUint8Array(),
      });
      if (createWalletRes.success === false) {
        console.error(createWalletRes.err);
        throw new Error("Failed to create wallet");
      }

      const checkKeyShareRes = await checkKeyShare(pool, {
        user_auth_id: email,
        auth_type: "google",
        public_key: publicKeyBytes,
        curve_type: "secp256k1",
      });
      if (checkKeyShareRes.success === false) {
        console.error(checkKeyShareRes.msg);
        throw new Error("Failed to check key share");
      }

      expect(checkKeyShareRes.success).toBe(true);
      expect(checkKeyShareRes.data?.exists).toBe(false);
    });
  });
});
