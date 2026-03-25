import {
  napiRunTriples2ClientStep1,
  napiRunTriples2ClientStep2,
} from "@oko-wallet/cait-sith-keplr-addon/addon";
import { insertCustomer } from "@oko-wallet/oko-pg-interface/customers";
import { insertKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";
import { createUser } from "@oko-wallet/oko-pg-interface/oko_users";
import { createWallet } from "@oko-wallet/oko-pg-interface/oko_wallets";
import { createTssSession } from "@oko-wallet/oko-pg-interface/tss";
import type { AbortTssSessionRequest } from "@oko-wallet/oko-types/tss";
import {
  TriplesStageStatus,
  TssSessionState,
  TssStageType,
} from "@oko-wallet/oko-types/tss";
import type { WalletStatus } from "@oko-wallet/oko-types/wallets";
import { createPgConn } from "@oko-wallet/postgres-lib";
import { Participant } from "@oko-wallet/tecdsa-interface";
import type { Pool } from "pg";

import { TEST_CUSTOMER } from "@oko-wallet-api/api/tss/tests";
import { abortTssSession } from "@oko-wallet-api/api/tss/tss_session";
import {
  runTriplesStep1,
  runTriplesStep2,
} from "@oko-wallet-api/api/tss/v1/triples";
import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";

const SSS_THRESHOLD = 2;

describe("tss_session_test", () => {
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

  beforeEach(async () => {
    await resetPgDatabase(pool);
    await insertKeyShareNodeMeta(pool, {
      sss_threshold: SSS_THRESHOLD,
      registration_threshold: null,
    });
  });

  describe("abortTssSession", () => {
    it("abort tss session success", async () => {
      const email = "test@test.com";

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error(`Failed to create user: ${createUserRes.err}`);
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from("test_public_key", "hex"),
        enc_tss_share: Buffer.from("test_enc_share", "hex"),
        status: "ACTIVE",
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error(`Failed to create wallet: ${createWalletRes.err}`);
      }

      const walletId = createWalletRes.data.wallet_id;

      const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
      if (insertCustomerRes.success === false) {
        throw new Error(`Failed to insert customer: ${insertCustomerRes.err}`);
      }

      const createTssSessionRes = await createTssSession(pool, {
        wallet_id: walletId,
        customer_id: insertCustomerRes.data.customer_id,
      });
      if (createTssSessionRes.success === false) {
        throw new Error(
          `Failed to create TSS session: ${createTssSessionRes.err}`,
        );
      }

      const sessionId = createTssSessionRes.data.session_id;

      const abortRequest: AbortTssSessionRequest = {
        email,
        wallet_id: walletId,
        session_id: sessionId,
      };

      const abortResponse = await abortTssSession(pool, abortRequest);

      expect(abortResponse.success).toBe(true);
      if (abortResponse.success === false) {
        throw new Error(`Failed to abort TSS session: ${abortResponse.msg}`);
      }
      expect(abortResponse.data.session_id).toBe(sessionId);

      const sessionQuery = await pool.query(
        "SELECT state FROM tss_sessions WHERE session_id = $1",
        [sessionId],
      );
      expect(sessionQuery.rows).toHaveLength(1);
      expect(sessionQuery.rows[0].state).toBe(TssSessionState.ABORTED);
    });

    it("abort tss session failure - unauthorized", async () => {
      const email = "test@test.com";
      const differentEmail = "different@test.com";

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error(`Failed to create user: ${createUserRes.err}`);
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from("test_public_key", "hex"),
        enc_tss_share: Buffer.from("test_enc_share", "hex"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error(`Failed to create wallet: ${createWalletRes.err}`);
      }

      const walletId = createWalletRes.data.wallet_id;

      const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
      if (insertCustomerRes.success === false) {
        throw new Error(`Failed to insert customer: ${insertCustomerRes.err}`);
      }

      const createTssSessionRes = await createTssSession(pool, {
        wallet_id: walletId,
        customer_id: insertCustomerRes.data.customer_id,
      });
      if (createTssSessionRes.success === false) {
        throw new Error(
          `Failed to create TSS session: ${createTssSessionRes.err}`,
        );
      }

      const sessionId = createTssSessionRes.data.session_id;

      const abortRequest: AbortTssSessionRequest = {
        email: differentEmail,
        wallet_id: walletId,
        session_id: sessionId,
      };

      const abortResponse = await abortTssSession(pool, abortRequest);

      expect(abortResponse.success).toBe(false);
      if (abortResponse.success === true) {
        throw new Error(`success should be false`);
      }
      expect(abortResponse.code).toBe("UNAUTHORIZED");
    });

    it("abort tss session failure - not found", async () => {
      const email = "test@test.com";

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error(`Failed to create user: ${createUserRes.err}`);
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from("test_public_key", "hex"),
        enc_tss_share: Buffer.from("test_enc_share", "hex"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error(`Failed to create wallet: ${createWalletRes.err}`);
      }

      const walletId = createWalletRes.data.wallet_id;

      const nonExistentSessionId = "110e8400-e29b-41d4-a716-446655440001";
      const abortRequest: AbortTssSessionRequest = {
        email,
        wallet_id: walletId,
        session_id: nonExistentSessionId,
      };

      const abortResponse = await abortTssSession(pool, abortRequest);

      expect(abortResponse.success).toBe(false);
      if (abortResponse.success === true) {
        throw new Error(`success should be false`);
      }
      expect(abortResponse.code).toBe("TSS_SESSION_NOT_FOUND");
    });

    it("abort tss session failure - already completed", async () => {
      const email = "test@test.com";

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error(`Failed to create user: ${createUserRes.err}`);
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from("test_public_key", "hex"),
        enc_tss_share: Buffer.from("test_enc_share", "hex"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error(`Failed to create wallet: ${createWalletRes.err}`);
      }

      const walletId = createWalletRes.data.wallet_id;

      const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
      if (insertCustomerRes.success === false) {
        throw new Error(`Failed to insert customer: ${insertCustomerRes.err}`);
      }

      const createTssSessionRes = await createTssSession(pool, {
        wallet_id: walletId,
        customer_id: insertCustomerRes.data.customer_id,
      });
      if (createTssSessionRes.success === false) {
        throw new Error(
          `Failed to create TSS session: ${createTssSessionRes.err}`,
        );
      }

      const sessionId = createTssSessionRes.data.session_id;

      await pool.query(
        "UPDATE tss_sessions SET state = $1 WHERE session_id = $2",
        [TssSessionState.COMPLETED, sessionId],
      );

      const abortRequest: AbortTssSessionRequest = {
        email,
        wallet_id: walletId,
        session_id: sessionId,
      };

      const abortResponse = await abortTssSession(pool, abortRequest);

      expect(abortResponse.success).toBe(false);
      if (abortResponse.success === true) {
        throw new Error(`success should be false`);
      }
      expect(abortResponse.code).toBe("INVALID_TSS_SESSION");
    });

    it("abort tss session failure - already failed", async () => {
      const email = "test@test.com";

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error(`Failed to create user: ${createUserRes.err}`);
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from("test_public_key", "hex"),
        enc_tss_share: Buffer.from("test_enc_share", "hex"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error(`Failed to create wallet: ${createWalletRes.err}`);
      }

      const walletId = createWalletRes.data.wallet_id;

      const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
      if (insertCustomerRes.success === false) {
        throw new Error(`Failed to insert customer: ${insertCustomerRes.err}`);
      }

      const createTssSessionRes = await createTssSession(pool, {
        wallet_id: walletId,
        customer_id: insertCustomerRes.data.customer_id,
      });
      if (createTssSessionRes.success === false) {
        throw new Error(
          `Failed to create TSS session: ${createTssSessionRes.err}`,
        );
      }

      const sessionId = createTssSessionRes.data.session_id;

      await pool.query(
        "UPDATE tss_sessions SET state = $1 WHERE session_id = $2",
        [TssSessionState.FAILED, sessionId],
      );

      const abortRequest: AbortTssSessionRequest = {
        email,
        wallet_id: walletId,
        session_id: sessionId,
      };

      const abortResponse = await abortTssSession(pool, abortRequest);

      expect(abortResponse.success).toBe(false);
      if (abortResponse.success === true) {
        throw new Error(`success should be false`);
      }
      expect(abortResponse.code).toBe("INVALID_TSS_SESSION");
    });

    it("abort tss session failure - wallet_id does not match the session", async () => {
      const email = "test@test.com";

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error(`Failed to create user: ${createUserRes.err}`);
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from("test_public_key", "hex"),
        enc_tss_share: Buffer.from("test_enc_share", "hex"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error(`Failed to create wallet: ${createWalletRes.err}`);
      }

      const walletId = createWalletRes.data.wallet_id;
      const differentWalletId = "660e8400-e29b-41d4-a716-446655440000";

      const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
      if (insertCustomerRes.success === false) {
        throw new Error(`Failed to insert customer: ${insertCustomerRes.err}`);
      }

      const createTssSessionRes = await createTssSession(pool, {
        wallet_id: differentWalletId,
        customer_id: insertCustomerRes.data.customer_id,
      });
      if (createTssSessionRes.success === false) {
        throw new Error(
          `Failed to create TSS session: ${createTssSessionRes.err}`,
        );
      }

      const sessionId = createTssSessionRes.data.session_id;

      const abortRequest: AbortTssSessionRequest = {
        email,
        wallet_id: walletId,
        session_id: sessionId,
      };

      const abortResponse = await abortTssSession(pool, abortRequest);

      expect(abortResponse.success).toBe(false);
      if (abortResponse.success === true) {
        throw new Error(`success should be false`);
      }
      expect(abortResponse.code).toBe("INVALID_TSS_SESSION");
    });

    it("abort tss session failure - database error", async () => {
      const email = "test@test.com";

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error(`Failed to create user: ${createUserRes.err}`);
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from("test_public_key", "hex"),
        enc_tss_share: Buffer.from("test_enc_share", "hex"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error(`Failed to create wallet: ${createWalletRes.err}`);
      }

      const walletId = createWalletRes.data.wallet_id;

      const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
      if (insertCustomerRes.success === false) {
        throw new Error(`Failed to insert customer: ${insertCustomerRes.err}`);
      }

      const createTssSessionRes = await createTssSession(pool, {
        wallet_id: walletId,
        customer_id: insertCustomerRes.data.customer_id,
      });
      if (createTssSessionRes.success === false) {
        throw new Error(
          `Failed to create TSS session: ${createTssSessionRes.err}`,
        );
      }

      const invalidSessionId = "invalid-uuid";
      const abortRequest: AbortTssSessionRequest = {
        email,
        wallet_id: walletId,
        session_id: invalidSessionId,
      };

      const abortResponse = await abortTssSession(pool, abortRequest);
      expect(abortResponse.success).toBe(false);
      if (abortResponse.success === true) {
        throw new Error(`success should be false`);
      }
      expect(abortResponse.code).toBe("UNKNOWN_ERROR");
    });

    it("should fail triplesStep2 when session is aborted after triplesStep1", async () => {
      const email = "test@test.com";

      const createUserRes = await createUser(pool, email, "google");
      if (createUserRes.success === false) {
        throw new Error(`Failed to create user: ${createUserRes.err}`);
      }

      const createWalletRes = await createWallet(pool, {
        user_id: createUserRes.data.user_id,
        curve_type: "secp256k1",
        public_key: Buffer.from(`test_public_key_${Date.now()}`, "hex"),
        enc_tss_share: Buffer.from(`test_enc_share_${Date.now()}`, "hex"),
        status: "ACTIVE" as WalletStatus,
        sss_threshold: SSS_THRESHOLD,
      });
      if (createWalletRes.success === false) {
        throw new Error(`Failed to create wallet: ${createWalletRes.err}`);
      }

      const walletId = createWalletRes.data.wallet_id;

      const insertCustomerRes = await insertCustomer(pool, {
        customer_id: `110e8400-e29b-41d4-a716-${Date.now().toString(16).padStart(12, "0")}`,
        label: "test customer",
        status: "ACTIVE",
        url: "https://test.com",
        logo_url: "https://test.com/logo.png",
      });
      if (insertCustomerRes.success === false) {
        throw new Error(`Failed to insert customer: ${insertCustomerRes.err}`);
      }

      // Step 1: Run triplesStep1 to create session and stage
      const clientTriplesResult1 = napiRunTriples2ClientStep1();
      const triplesStep1Request = {
        email,
        wallet_id: walletId,
        customer_id: insertCustomerRes.data.customer_id,
        msgs_1: clientTriplesResult1.msgs_1,
      };

      const triplesStep1Response = await runTriplesStep1(
        pool,
        triplesStep1Request,
      );
      expect(triplesStep1Response.success).toBe(true);
      if (triplesStep1Response.success === false) {
        throw new Error(
          `Failed to run triplesStep1: ${triplesStep1Response.msg}`,
        );
      }

      const sessionId = triplesStep1Response.data.session_id;

      // Verify session and stage were created
      const sessionQuery = await pool.query(
        "SELECT state FROM tss_sessions WHERE session_id = $1",
        [sessionId],
      );
      expect(sessionQuery.rows).toHaveLength(1);
      expect(sessionQuery.rows[0].state).toBe(TssSessionState.IN_PROGRESS);

      const stageQuery = await pool.query(
        "SELECT stage_status FROM tss_stages WHERE session_id = $1 AND stage_type = $2",
        [sessionId, TssStageType.TRIPLES],
      );
      expect(stageQuery.rows).toHaveLength(1);
      expect(stageQuery.rows[0].stage_status).toBe(TriplesStageStatus.STEP_1);

      // Step 2: Abort the session
      const abortRequest: AbortTssSessionRequest = {
        email,
        wallet_id: walletId,
        session_id: sessionId,
      };

      const abortResponse = await abortTssSession(pool, abortRequest);
      expect(abortResponse.success).toBe(true);
      if (abortResponse.success === false) {
        throw new Error(`Failed to abort TSS session: ${abortResponse.msg}`);
      }

      // Verify session state was updated to ABORTED
      const abortedSessionQuery = await pool.query(
        "SELECT state FROM tss_sessions WHERE session_id = $1",
        [sessionId],
      );
      expect(abortedSessionQuery.rows).toHaveLength(1);
      expect(abortedSessionQuery.rows[0].state).toBe(TssSessionState.ABORTED);

      // Step 3: Try to run triplesStep2 with the aborted session
      const clientTriplesResult2 = napiRunTriples2ClientStep2(
        clientTriplesResult1.st_0,
        triplesStep1Response.data.msgs_0,
      );
      const triplesStep2Request = {
        email,
        wallet_id: walletId,
        session_id: sessionId,
        wait_1: clientTriplesResult2.msgs_1.wait_1[Participant.P0],
      };

      const triplesStep2Response = await runTriplesStep2(
        pool,
        triplesStep2Request,
      );

      // Should fail because session is aborted (not IN_PROGRESS)
      expect(triplesStep2Response.success).toBe(false);
      if (triplesStep2Response.success === true) {
        throw new Error(`triplesStep2 should fail for aborted session`);
      }
      expect(triplesStep2Response.code).toBe("INVALID_TSS_SESSION");
      expect(triplesStep2Response.msg).toContain(
        `Invalid tss session: ${sessionId}`,
      );
    });
  });
});
