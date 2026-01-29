import { Pool } from "pg";
import {
  createKeyShare,
  createUser,
  createWallet,
} from "@oko-wallet/ksn-pg-interface";
import {
  Bytes,
  type Bytes32,
  type Bytes33,
  type Bytes64,
} from "@oko-wallet/bytes";

import { connectPG, resetPgDatabase } from "@oko-wallet-ksn-server/database";
import { testPgConfig } from "@oko-wallet-ksn-server/database/test_config";
import {
  checkKeyShareV2,
  getKeyShareV2,
  registerKeyShareV2,
  registerEd25519V2,
  reshareKeyShareV2,
  reshareRegisterV2,
} from "@oko-wallet-ksn-server/api/key_share";
import { encryptDataAsync } from "@oko-wallet-ksn-server/encrypt";

const TEST_ENC_SECRET = "test_enc_secret";

// Test public keys
const TEST_SECP256K1_PK =
  "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC566D";
const TEST_SECP256K1_PK_2 =
  "028812785B3F855F677594A6FEB76CA3FD39F2CA36AC5A8454A1417C4232AC5600";
const TEST_ED25519_PK =
  "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";
const TEST_ED25519_PK_2 =
  "e75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511b";

// Test user auth IDs (Google ID token sub format)
const TEST_USER_AUTH_ID = "google_109234567890123456789";
const TEST_USER_AUTH_ID_NONEXISTENT = "google_000000000000000000000";

// Helper functions
function generateRandomShare(): Bytes64 {
  const shareArr = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 256),
  );
  const shareRes = Bytes.fromUint8Array(new Uint8Array(shareArr), 64);
  if (shareRes.success === false) {
    throw new Error("Failed to generate random share");
  }
  return shareRes.data;
}

function parseSecp256k1PublicKey(hex: string): Bytes33 {
  const res = Bytes.fromHexString(hex, 33);
  if (res.success === false) {
    throw new Error(`Failed to parse secp256k1 public key: ${res.err}`);
  }
  return res.data;
}

function parseEd25519PublicKey(hex: string): Bytes32 {
  const res = Bytes.fromHexString(hex, 32);
  if (res.success === false) {
    throw new Error(`Failed to parse ed25519 public key: ${res.err}`);
  }
  return res.data;
}

describe("key_share_v2_test", () => {
  let pool: Pool;

  beforeAll(async () => {
    const createPostgresRes = await connectPG(testPgConfig);
    if (createPostgresRes.success === false) {
      console.error(createPostgresRes.err);
      throw new Error("Failed to connect to postgres database");
    }
    pool = createPostgresRes.data;
  });

  beforeEach(async () => {
    await resetPgDatabase(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  // ============================================================================
  // registerKeyShareV2
  // ============================================================================
  describe("registerKeyShareV2", () => {
    it("3.1 success - new user both", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      const result = await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);
    });

    it("3.2 failure - INVALID_REQUEST (missing ed25519)", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const secp256k1Share = generateRandomShare();

      const result = await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("INVALID_REQUEST");
      }
    });

    it("3.3 failure - DUPLICATE_PUBLIC_KEY", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      // Pre-create wallet with same public key
      await createWallet(pool, {
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        curve_type: "secp256k1",
        public_key: secp256k1Pk.toUint8Array(),
      });

      const result = await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("DUPLICATE_PUBLIC_KEY");
      }
    });

  });

  // ============================================================================
  // checkKeyShareV2
  // ============================================================================
  describe("checkKeyShareV2", () => {
    it("2.1 success - exists (both)", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      // Register first
      await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      const result = await checkKeyShareV2(pool, {
        user_auth_id: TEST_USER_AUTH_ID,
        auth_type: "google",
        wallets: {
          secp256k1: secp256k1Pk,
          ed25519: ed25519Pk,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.secp256k1?.exists).toBe(true);
        expect(result.data.ed25519?.exists).toBe(true);
      }
    });

    it("2.2 success - partial exists (secp256k1 only, legacy user)", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();

      // Create user with only secp256k1 using low-level functions (simulating legacy user)
      const createUserRes = await createUser(pool, "google", TEST_USER_AUTH_ID);
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      const walletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: secp256k1Pk.toUint8Array(),
      });
      if (walletRes.success === false) {
        throw new Error("Failed to create wallet");
      }

      await createKeyShare(pool, {
        wallet_id: walletRes.data.wallet_id,
        enc_share: Buffer.from(secp256k1Share.toUint8Array()),
      });

      const result = await checkKeyShareV2(pool, {
        user_auth_id: TEST_USER_AUTH_ID,
        auth_type: "google",
        wallets: {
          secp256k1: secp256k1Pk,
          ed25519: ed25519Pk,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.secp256k1?.exists).toBe(true);
        expect(result.data.ed25519?.exists).toBe(false);
      }
    });

    it("2.3 success - user not found", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);

      const result = await checkKeyShareV2(pool, {
        user_auth_id: TEST_USER_AUTH_ID_NONEXISTENT,
        auth_type: "google",
        wallets: {
          secp256k1: secp256k1Pk,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.secp256k1?.exists).toBe(false);
      }
    });

    it("2.4 success - wallet not found (user exists)", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const secp256k1Pk2 = parseSecp256k1PublicKey(TEST_SECP256K1_PK_2);
      const secp256k1Share = generateRandomShare();

      // Register with different pk
      await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk2, share: secp256k1Share },
          },
        },
        TEST_ENC_SECRET,
      );

      // Check with different pk
      const result = await checkKeyShareV2(pool, {
        user_auth_id: TEST_USER_AUTH_ID,
        auth_type: "google",
        wallets: {
          secp256k1: secp256k1Pk,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.secp256k1?.exists).toBe(false);
      }
    });

    it("2.5 success - key share not found (wallet exists)", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);

      // Create user and wallet without key share
      const createUserRes = await createUser(pool, "google", TEST_USER_AUTH_ID);
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: secp256k1Pk.toUint8Array(),
      });

      const result = await checkKeyShareV2(pool, {
        user_auth_id: TEST_USER_AUTH_ID,
        auth_type: "google",
        wallets: {
          secp256k1: secp256k1Pk,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.secp256k1?.exists).toBe(false);
      }
    });
  });

  // ============================================================================
  // getKeyShareV2
  // ============================================================================
  describe("getKeyShareV2", () => {
    it("1.1 success - secp256k1 only (legacy user)", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const secp256k1Share = generateRandomShare();

      // Create legacy user with only secp256k1 using low-level functions
      const createUserRes = await createUser(pool, "google", TEST_USER_AUTH_ID);
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      const walletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: secp256k1Pk.toUint8Array(),
      });
      if (walletRes.success === false) {
        throw new Error("Failed to create wallet");
      }

      // Encrypt the share before storing (same as registerKeyShareV2 does)
      const encryptedShare = await encryptDataAsync(
        secp256k1Share.toHex(),
        TEST_ENC_SECRET,
      );

      await createKeyShare(pool, {
        wallet_id: walletRes.data.wallet_id,
        enc_share: Buffer.from(encryptedShare, "utf8"),
      });

      const result = await getKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: secp256k1Pk,
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.secp256k1).toBeDefined();
        expect(result.data.secp256k1?.share).toBe(secp256k1Share.toHex());
      }
    });

    it("1.2 success - ed25519 only", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      const result = await getKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            ed25519: ed25519Pk,
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ed25519).toBeDefined();
        expect(result.data.ed25519?.share).toBe(ed25519Share.toHex());
        expect(result.data.secp256k1).toBeUndefined();
      }
    });

    it("1.3 success - both", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      const result = await getKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: secp256k1Pk,
            ed25519: ed25519Pk,
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.secp256k1?.share).toBe(secp256k1Share.toHex());
        expect(result.data.ed25519?.share).toBe(ed25519Share.toHex());
      }
    });

    it("1.4 failure - USER_NOT_FOUND", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);

      const result = await getKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID_NONEXISTENT,
          auth_type: "google",
          wallets: {
            secp256k1: secp256k1Pk,
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("USER_NOT_FOUND");
      }
    });

    it("1.5 failure - WALLET_NOT_FOUND", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const secp256k1Pk2 = parseSecp256k1PublicKey(TEST_SECP256K1_PK_2);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      // Register with different secp256k1 pk (but include ed25519 for valid registration)
      await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk2, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      // Try to get with non-existent secp256k1 pk
      const result = await getKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: secp256k1Pk,
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("WALLET_NOT_FOUND");
      }
    });

    it("1.6 failure - UNAUTHORIZED (wallet belongs to different user)", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);

      // Create user and wallet belonging to a different user
      await createUser(pool, "google", TEST_USER_AUTH_ID);
      await createWallet(pool, {
        user_id: "550e8400-e29b-41d4-a716-446655440000", // Different user_id
        curve_type: "secp256k1",
        public_key: secp256k1Pk.toUint8Array(),
      });

      const result = await getKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: secp256k1Pk,
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("UNAUTHORIZED");
      }
    });

    it("1.7 failure - KEY_SHARE_NOT_FOUND", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);

      // Create user and wallet without key share
      const createUserRes = await createUser(pool, "google", TEST_USER_AUTH_ID);
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: secp256k1Pk.toUint8Array(),
      });

      const result = await getKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: secp256k1Pk,
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("KEY_SHARE_NOT_FOUND");
      }
    });
  });

  // ============================================================================
  // registerEd25519V2
  // ============================================================================
  describe("registerEd25519V2", () => {
    it("4.1 success - add ed25519 to user with secp256k1 (legacy user)", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      // Create legacy user with only secp256k1 using low-level functions
      const createUserRes = await createUser(pool, "google", TEST_USER_AUTH_ID);
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      const walletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: secp256k1Pk.toUint8Array(),
      });
      if (walletRes.success === false) {
        throw new Error("Failed to create wallet");
      }

      await createKeyShare(pool, {
        wallet_id: walletRes.data.wallet_id,
        enc_share: Buffer.from(secp256k1Share.toUint8Array()),
      });

      // Then add ed25519
      const result = await registerEd25519V2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          public_key: ed25519Pk,
          share: ed25519Share,
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);

      // Verify both exist
      const checkResult = await checkKeyShareV2(pool, {
        user_auth_id: TEST_USER_AUTH_ID,
        auth_type: "google",
        wallets: {
          secp256k1: secp256k1Pk,
          ed25519: ed25519Pk,
        },
      });

      expect(checkResult.success).toBe(true);
      if (checkResult.success) {
        expect(checkResult.data.secp256k1?.exists).toBe(true);
        expect(checkResult.data.ed25519?.exists).toBe(true);
      }
    });

    it("4.2 failure - USER_NOT_FOUND", async () => {
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const ed25519Share = generateRandomShare();

      const result = await registerEd25519V2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID_NONEXISTENT,
          auth_type: "google",
          public_key: ed25519Pk,
          share: ed25519Share,
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("USER_NOT_FOUND");
      }
    });

    it("4.3 failure - WALLET_NOT_FOUND (no secp256k1)", async () => {
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const ed25519Share = generateRandomShare();

      // Create user without any wallets
      await createUser(pool, "google", TEST_USER_AUTH_ID);

      const result = await registerEd25519V2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          public_key: ed25519Pk,
          share: ed25519Share,
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("WALLET_NOT_FOUND");
      }
    });

    it("4.4 failure - DUPLICATE_PUBLIC_KEY (ed25519 already exists)", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      // Register both
      await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      // Try to add ed25519 again
      const result = await registerEd25519V2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          public_key: ed25519Pk,
          share: ed25519Share,
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("DUPLICATE_PUBLIC_KEY");
      }
    });
  });

  // ============================================================================
  // reshareKeyShareV2
  // ============================================================================
  describe("reshareKeyShareV2", () => {
    it("5.1 success - both", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      // Register first
      await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      // Reshare both
      const result = await reshareKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);
    });

    it("5.2 success - secp256k1 only", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      // Register both
      await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      // Reshare secp256k1 only
      const result = await reshareKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);
    });

    it("5.3 success - ed25519 only", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      // Register both
      await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      // Reshare ed25519 only
      const result = await reshareKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);
    });

    it("5.4 failure - USER_NOT_FOUND", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const secp256k1Share = generateRandomShare();

      const result = await reshareKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID_NONEXISTENT,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("USER_NOT_FOUND");
      }
    });

    it("5.5 failure - WALLET_NOT_FOUND", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const secp256k1Pk2 = parseSecp256k1PublicKey(TEST_SECP256K1_PK_2);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      // Register with different secp256k1 pk (but include ed25519 for valid registration)
      await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk2, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      // Try to reshare with non-existent secp256k1 pk
      const result = await reshareKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("WALLET_NOT_FOUND");
      }
    });

    it("5.6 failure - KEY_SHARE_NOT_FOUND", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const secp256k1Share = generateRandomShare();

      // Create user and wallet without key share
      const createUserRes = await createUser(pool, "google", TEST_USER_AUTH_ID);
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: secp256k1Pk.toUint8Array(),
      });

      const result = await reshareKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("KEY_SHARE_NOT_FOUND");
      }
    });

    it("5.7 failure - RESHARE_FAILED (wrong share value)", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();
      const wrongShare = generateRandomShare();

      // Register with both wallets
      await registerKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      // Try to reshare with wrong share
      const result = await reshareKeyShareV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: wrongShare },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("RESHARE_FAILED");
      }
    });
  });

  // ============================================================================
  // reshareRegisterV2
  // ============================================================================
  describe("reshareRegisterV2", () => {
    it("6.1 success - existing user both", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const secp256k1Share = generateRandomShare();
      const ed25519Share = generateRandomShare();

      // Create user only (simulating user exists on other nodes)
      await createUser(pool, "google", TEST_USER_AUTH_ID);

      // Register via reshareRegisterV2
      const result = await reshareRegisterV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);

      // Verify both exist
      const checkResult = await checkKeyShareV2(pool, {
        user_auth_id: TEST_USER_AUTH_ID,
        auth_type: "google",
        wallets: {
          secp256k1: secp256k1Pk,
          ed25519: ed25519Pk,
        },
      });

      expect(checkResult.success).toBe(true);
      if (checkResult.success) {
        expect(checkResult.data.secp256k1?.exists).toBe(true);
        expect(checkResult.data.ed25519?.exists).toBe(true);
      }
    });

    it("6.2 success - existing user secp256k1 only", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const secp256k1Share = generateRandomShare();

      // Create user only
      await createUser(pool, "google", TEST_USER_AUTH_ID);

      // Register secp256k1 via reshareRegisterV2
      const result = await reshareRegisterV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);
    });

    it("6.3 success - existing user ed25519 only", async () => {
      const ed25519Pk = parseEd25519PublicKey(TEST_ED25519_PK);
      const ed25519Share = generateRandomShare();

      // Create user only
      await createUser(pool, "google", TEST_USER_AUTH_ID);

      // Register ed25519 via reshareRegisterV2
      const result = await reshareRegisterV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            ed25519: { public_key: ed25519Pk, share: ed25519Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);
    });

    it("6.4 success - creates new user if not exists (reshare scenario)", async () => {
      // reshareRegisterV2 is designed to create users that don't exist locally
      // This is for reshare to new nodes where user exists on other nodes
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const secp256k1Share = generateRandomShare();

      const result = await reshareRegisterV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID_NONEXISTENT,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(true);

      // Verify the user and wallet were created
      const checkResult = await checkKeyShareV2(pool, {
        user_auth_id: TEST_USER_AUTH_ID_NONEXISTENT,
        auth_type: "google",
        wallets: {
          secp256k1: secp256k1Pk,
        },
      });

      expect(checkResult.success).toBe(true);
      if (checkResult.success) {
        expect(checkResult.data.secp256k1?.exists).toBe(true);
      }
    });

    it("6.5 failure - DUPLICATE_PUBLIC_KEY", async () => {
      const secp256k1Pk = parseSecp256k1PublicKey(TEST_SECP256K1_PK);
      const secp256k1Share = generateRandomShare();

      // Create user and wallet
      const createUserRes = await createUser(pool, "google", TEST_USER_AUTH_ID);
      if (createUserRes.success === false) {
        throw new Error("Failed to create user");
      }

      await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: secp256k1Pk.toUint8Array(),
      });

      // Try to register same pk via reshareRegisterV2
      const result = await reshareRegisterV2(
        pool,
        {
          user_auth_id: TEST_USER_AUTH_ID,
          auth_type: "google",
          wallets: {
            secp256k1: { public_key: secp256k1Pk, share: secp256k1Share },
          },
        },
        TEST_ENC_SECRET,
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.code).toBe("DUPLICATE_PUBLIC_KEY");
      }
    });
  });
});
