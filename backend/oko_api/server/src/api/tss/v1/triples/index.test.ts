import {
  napiRunKeygenClientCentralized,
  napiRunTriples2ClientStep1,
  napiRunTriples2ClientStep2,
  napiRunTriples2ClientStep3,
  napiRunTriples2ClientStep4,
  napiRunTriples2ClientStep5,
  napiRunTriples2ClientStep6,
  napiRunTriples2ClientStep7,
  napiRunTriples2ClientStep8,
  napiRunTriples2ClientStep9,
  napiRunTriples2ClientStep10,
  napiRunTriples2ClientStep11,
} from "@oko-wallet/cait-sith-keplr-addon/addon";
import { insertCustomer } from "@oko-wallet/oko-pg-interface/customers";
import { insertKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";
import { createUser } from "@oko-wallet/oko-pg-interface/oko_users";
import { createWallet } from "@oko-wallet/oko-pg-interface/oko_wallets";
import {
  createTssSession,
  createTssStage,
  getTssStageWithSessionData,
} from "@oko-wallet/oko-pg-interface/tss";
import type {
  TriplesStep1Request,
  TriplesStep2Request,
  TriplesStep3Request,
  TriplesStep4Request,
  TriplesStep5Request,
  TriplesStep6Request,
  TriplesStep7Request,
  TriplesStep8Request,
  TriplesStep9Request,
  TriplesStep10Request,
  TriplesStep11Request,
} from "@oko-wallet/oko-types/tss";
import {
  TriplesStageStatus,
  TssSessionState,
  TssStageType,
} from "@oko-wallet/oko-types/tss";
import type { WalletStatus } from "@oko-wallet/oko-types/wallets";
import { createPgConn } from "@oko-wallet/postgres-lib";
import {
  Participant,
  type TECDSATriplesState,
} from "@oko-wallet/tecdsa-interface";
import type { Pool } from "pg";

import {
  runTriplesStep1,
  runTriplesStep2,
  runTriplesStep3,
  runTriplesStep4,
  runTriplesStep5,
  runTriplesStep6,
  runTriplesStep7,
  runTriplesStep8,
  runTriplesStep9,
  runTriplesStep10,
  runTriplesStep11,
} from ".";
import { TEST_CUSTOMER } from "@oko-wallet-api/api/tss/tests";
import { testPgConfig } from "@oko-wallet-api/database/test_config";
import { resetPgDatabase } from "@oko-wallet-api/testing/database";

const SSS_THRESHOLD = 2;

describe("triples_test", () => {
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

  it("run triples success", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }

    const createWalletRes = await createWallet(pool, {
      user_id: createUserRes.data.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const clientTriplesState: TECDSATriplesState = {
      triplesState: null,
      triplesMessages: null,
      triple0Pub: null,
      triple1Pub: null,
      triple0Share: null,
      triple1Share: null,
    };

    // step 1
    const clientTriplesResult1 = napiRunTriples2ClientStep1();
    clientTriplesState.triplesState = clientTriplesResult1.st_0;

    const triplesStep1Request: TriplesStep1Request = {
      email,
      wallet_id: wallet.wallet_id,
      customer_id: customerId,
      msgs_1: clientTriplesResult1.msgs_1,
    };

    const triplesStep1Response = await runTriplesStep1(
      pool,
      triplesStep1Request,
    );
    if (triplesStep1Response.success === false) {
      console.error(triplesStep1Response);
      throw new Error("Failed to run triples step 1");
    }
    clientTriplesState.triplesMessages = triplesStep1Response.data?.msgs_0;
    const sessionId = triplesStep1Response.data?.session_id;

    expect(triplesStep1Response.success).toBe(true);
    expect(sessionId).toBeDefined();
    expect(clientTriplesState.triplesMessages).toBeDefined();

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      console.error(
        `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      );
      throw new Error("Failed to get tss stage with session data");
    }

    const triplesStage = getTssStageWithSessionDataRes.data;
    expect(triplesStage).toBeDefined();
    expect(triplesStage?.session_id).toEqual(sessionId);
    expect(triplesStage?.stage_type).toEqual(TssStageType.TRIPLES);
    expect(triplesStage?.stage_status).toEqual(TriplesStageStatus.STEP_1);
    expect(triplesStage?.stage_data).toBeDefined();
    expect(triplesStage?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(triplesStage?.wallet_id).toEqual(wallet.wallet_id);

    // step 2
    const clientTriplesResult2 = napiRunTriples2ClientStep2(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult2.st_0;

    const triplesStep2Request: TriplesStep2Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      wait_1: clientTriplesResult2.msgs_1.wait_1[Participant.P0],
    };

    const triplesStep2Response = await runTriplesStep2(
      pool,
      triplesStep2Request,
    );
    if (triplesStep2Response.success === false) {
      console.error(triplesStep2Response);
      throw new Error("Failed to run triples step 2");
    }
    clientTriplesState.triplesMessages!.wait_1[Participant.P1] =
      triplesStep2Response.data?.wait_1;

    expect(triplesStep2Response.success).toBe(true);
    expect(
      clientTriplesState.triplesMessages?.wait_1[Participant.P1],
    ).toBeDefined();

    const getTssStageWithSessionDataRes2 = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes2.success === false) {
      console.error(
        `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes2.err}`,
      );
      throw new Error("Failed to get tss stage with session data");
    }

    const triplesStage2 = getTssStageWithSessionDataRes2.data;
    expect(triplesStage2).toBeDefined();
    expect(triplesStage2?.session_id).toEqual(sessionId);
    expect(triplesStage2?.stage_type).toEqual(TssStageType.TRIPLES);
    expect(triplesStage2?.stage_status).toEqual(TriplesStageStatus.STEP_2);
    expect(triplesStage2?.stage_data).toBeDefined();
    expect(triplesStage2?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(triplesStage2?.wallet_id).toEqual(wallet.wallet_id);

    // step 3
    const clientTriplesResult3 = napiRunTriples2ClientStep3(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult3.st_0;

    const triplesStep3Request: TriplesStep3Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      wait_2: clientTriplesResult3.msgs_1.wait_2[Participant.P0],
    };

    const triplesStep3Response = await runTriplesStep3(
      pool,
      triplesStep3Request,
    );
    if (triplesStep3Response.success === false) {
      console.error(triplesStep3Response);
      throw new Error("Failed to run triples step 3");
    }
    clientTriplesState.triplesMessages!.wait_2[Participant.P1] =
      triplesStep3Response.data?.wait_2;

    expect(triplesStep3Response.success).toBe(true);
    expect(
      clientTriplesState.triplesMessages?.wait_2[Participant.P1],
    ).toBeDefined();

    const getTssStageWithSessionDataRes3 = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes3.success === false) {
      console.error(
        `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes3.err}`,
      );
      throw new Error("Failed to get tss stage with session data");
    }

    const triplesStage3 = getTssStageWithSessionDataRes3.data;
    expect(triplesStage3).toBeDefined();
    expect(triplesStage3?.session_id).toEqual(sessionId);
    expect(triplesStage3?.stage_type).toEqual(TssStageType.TRIPLES);
    expect(triplesStage3?.stage_status).toEqual(TriplesStageStatus.STEP_3);
    expect(triplesStage3?.stage_data).toBeDefined();
    expect(triplesStage3?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(triplesStage3?.wallet_id).toEqual(wallet.wallet_id);

    // step 4
    const clientTriplesResult4 = napiRunTriples2ClientStep4(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult4.st_0;

    const triplesStep4Request: TriplesStep4Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      wait_3: clientTriplesResult4.msgs_1.wait_3[Participant.P0],
    };

    const triplesStep4Response = await runTriplesStep4(
      pool,
      triplesStep4Request,
    );
    if (triplesStep4Response.success === false) {
      console.error(triplesStep4Response);
      throw new Error("Failed to run triples step 4");
    }
    clientTriplesState.triplesMessages!.wait_3[Participant.P1] =
      triplesStep4Response.data?.wait_3;

    expect(triplesStep4Response.success).toBe(true);
    expect(
      clientTriplesState.triplesMessages?.wait_3[Participant.P1],
    ).toBeDefined();

    const getTssStageWithSessionDataRes4 = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes4.success === false) {
      console.error(
        `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes4.err}`,
      );
      throw new Error("Failed to get tss stage with session data");
    }

    const triplesStage4 = getTssStageWithSessionDataRes4.data;
    expect(triplesStage4).toBeDefined();
    expect(triplesStage4?.session_id).toEqual(sessionId);
    expect(triplesStage4?.stage_type).toEqual(TssStageType.TRIPLES);
    expect(triplesStage4?.stage_status).toEqual(TriplesStageStatus.STEP_4);
    expect(triplesStage4?.stage_data).toBeDefined();
    expect(triplesStage4?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(triplesStage4?.wallet_id).toEqual(wallet.wallet_id);

    // step 5
    const clientTriplesResult5 = napiRunTriples2ClientStep5(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult5.st_0;

    const triplesStep5Request: TriplesStep5Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      wait_4: clientTriplesResult5.msgs_1.wait_4[Participant.P0],
    };

    const triplesStep5Response = await runTriplesStep5(
      pool,
      triplesStep5Request,
    );
    if (triplesStep5Response.success === false) {
      console.error(triplesStep5Response);
      throw new Error("Failed to run triples step 5");
    }
    clientTriplesState.triplesMessages!.wait_4[Participant.P1] =
      triplesStep5Response.data?.wait_4;

    expect(triplesStep5Response.success).toBe(true);
    expect(
      clientTriplesState.triplesMessages?.wait_4[Participant.P1],
    ).toBeDefined();

    const getTssStageWithSessionDataRes5 = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes5.success === false) {
      console.error(
        `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes5.err}`,
      );
      throw new Error("Failed to get tss stage with session data");
    }

    const triplesStage5 = getTssStageWithSessionDataRes5.data;
    expect(triplesStage5).toBeDefined();
    expect(triplesStage5?.session_id).toEqual(sessionId);
    expect(triplesStage5?.stage_type).toEqual(TssStageType.TRIPLES);
    expect(triplesStage5?.stage_status).toEqual(TriplesStageStatus.STEP_5);
    expect(triplesStage5?.stage_data).toBeDefined();
    expect(triplesStage5?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(triplesStage5?.wallet_id).toEqual(wallet.wallet_id);

    // step 6
    const clientTriplesResult6 = napiRunTriples2ClientStep6(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult6.st_0;

    const triplesStep6Request: TriplesStep6Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      batch_random_ot_wait_0:
        clientTriplesResult6.msgs_1.batch_random_ot_wait_0[Participant.P0],
    };

    const triplesStep6Response = await runTriplesStep6(
      pool,
      triplesStep6Request,
    );
    if (triplesStep6Response.success === false) {
      console.error(triplesStep6Response);
      throw new Error("Failed to run triples step 6");
    }
    clientTriplesState.triplesMessages!.batch_random_ot_wait_0[Participant.P1] =
      triplesStep6Response.data?.batch_random_ot_wait_0;

    expect(triplesStep6Response.success).toBe(true);
    expect(
      clientTriplesState.triplesMessages?.batch_random_ot_wait_0[
        Participant.P1
      ],
    ).toBeDefined();

    const getTssStageWithSessionDataRes6 = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes6.success === false) {
      console.error(
        `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes6.err}`,
      );
      throw new Error("Failed to get tss stage with session data");
    }

    const triplesStage6 = getTssStageWithSessionDataRes6.data;
    expect(triplesStage6).toBeDefined();
    expect(triplesStage6?.session_id).toEqual(sessionId);
    expect(triplesStage6?.stage_type).toEqual(TssStageType.TRIPLES);
    expect(triplesStage6?.stage_status).toEqual(TriplesStageStatus.STEP_6);
    expect(triplesStage6?.stage_data).toBeDefined();
    expect(triplesStage6?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(triplesStage6?.wallet_id).toEqual(wallet.wallet_id);

    // step 7
    const clientTriplesResult7 = napiRunTriples2ClientStep7(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult7.st_0;

    const triplesStep7Request: TriplesStep7Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      correlated_ot_wait_0:
        clientTriplesResult7.msgs_1.correlated_ot_wait_0[Participant.P0],
    };

    const triplesStep7Response = await runTriplesStep7(
      pool,
      triplesStep7Request,
    );
    if (triplesStep7Response.success === false) {
      console.error(triplesStep7Response);
      throw new Error("Failed to run triples step 7");
    }
    clientTriplesState.triplesMessages!.random_ot_extension_wait_0[
      Participant.P1
    ] = triplesStep7Response.data?.random_ot_extension_wait_0;

    expect(triplesStep7Response.success).toBe(true);
    expect(
      clientTriplesState.triplesMessages?.random_ot_extension_wait_0[
        Participant.P1
      ],
    ).toBeDefined();

    const getTssStageWithSessionDataRes7 = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes7.success === false) {
      console.error(
        `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes7.err}`,
      );
      throw new Error("Failed to get tss stage with session data");
    }

    const triplesStage7 = getTssStageWithSessionDataRes7.data;
    expect(triplesStage7).toBeDefined();
    expect(triplesStage7?.session_id).toEqual(sessionId);
    expect(triplesStage7?.stage_type).toEqual(TssStageType.TRIPLES);
    expect(triplesStage7?.stage_status).toEqual(TriplesStageStatus.STEP_7);
    expect(triplesStage7?.stage_data).toBeDefined();
    expect(triplesStage7?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(triplesStage7?.wallet_id).toEqual(wallet.wallet_id);

    // step 8
    const clientTriplesResult8 = napiRunTriples2ClientStep8(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult8.st_0;

    const triplesStep8Request: TriplesStep8Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      random_ot_extension_wait_1:
        clientTriplesResult8.msgs_1.random_ot_extension_wait_1[Participant.P0],
    };

    const triplesStep8Response = await runTriplesStep8(
      pool,
      triplesStep8Request,
    );
    if (triplesStep8Response.success === false) {
      console.error(triplesStep8Response);
      throw new Error("Failed to run triples step 8");
    }
    clientTriplesState.triplesMessages!.mta_wait_0[Participant.P1] =
      triplesStep8Response.data?.mta_wait_0;

    expect(triplesStep8Response.success).toBe(true);
    expect(
      clientTriplesState.triplesMessages?.mta_wait_0[Participant.P1],
    ).toBeDefined();

    const getTssStageWithSessionDataRes8 = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes8.success === false) {
      console.error(
        `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes8.err}`,
      );
      throw new Error("Failed to get tss stage with session data");
    }

    const triplesStage8 = getTssStageWithSessionDataRes8.data;
    expect(triplesStage8).toBeDefined();
    expect(triplesStage8?.session_id).toEqual(sessionId);
    expect(triplesStage8?.stage_type).toEqual(TssStageType.TRIPLES);
    expect(triplesStage8?.stage_status).toEqual(TriplesStageStatus.STEP_8);
    expect(triplesStage8?.stage_data).toBeDefined();
    expect(triplesStage8?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(triplesStage8?.wallet_id).toEqual(wallet.wallet_id);

    // step 9
    const clientTriplesResult9 = napiRunTriples2ClientStep9(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult9.st_0;

    const triplesStep9Request: TriplesStep9Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      mta_wait_1: clientTriplesResult9.msgs_1.mta_wait_1[Participant.P0],
    };

    const triplesStep9Response = await runTriplesStep9(
      pool,
      triplesStep9Request,
    );
    if (triplesStep9Response.success === false) {
      console.error(triplesStep9Response);
      throw new Error("Failed to run triples step 9");
    }
    expect(triplesStep9Response.success).toBe(true);

    const getTssStageWithSessionDataRes9 = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes9.success === false) {
      console.error(
        `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes9.err}`,
      );
      throw new Error("Failed to get tss stage with session data");
    }

    const triplesStage9 = getTssStageWithSessionDataRes9.data;
    expect(triplesStage9).toBeDefined();
    expect(triplesStage9?.session_id).toEqual(sessionId);
    expect(triplesStage9?.stage_type).toEqual(TssStageType.TRIPLES);
    expect(triplesStage9?.stage_status).toEqual(TriplesStageStatus.STEP_9);
    expect(triplesStage9?.stage_data).toBeDefined();
    expect(triplesStage9?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(triplesStage9?.wallet_id).toEqual(wallet.wallet_id);

    // step 10
    const clientTriplesResult10 = napiRunTriples2ClientStep10(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult10.st_0;

    const triplesStep10Request: TriplesStep10Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      wait_5: clientTriplesResult10.msgs_1.wait_5[Participant.P0],
      wait_6: clientTriplesResult10.msgs_1.wait_6[Participant.P0],
    };

    const triplesStep10Response = await runTriplesStep10(
      pool,
      triplesStep10Request,
    );
    if (triplesStep10Response.success === false) {
      console.error(triplesStep10Response);
      throw new Error("Failed to run triples step 10");
    }
    clientTriplesState.triplesMessages!.wait_5[Participant.P1] =
      triplesStep10Response.data?.wait_5;
    clientTriplesState.triplesMessages!.wait_6[Participant.P1] =
      triplesStep10Response.data?.wait_6;

    expect(triplesStep10Response.success).toBe(true);
    expect(
      clientTriplesState.triplesMessages?.wait_5[Participant.P1],
    ).toBeDefined();
    expect(
      clientTriplesState.triplesMessages?.wait_6[Participant.P1],
    ).toBeDefined();

    const getTssStageWithSessionDataRes10 = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes10.success === false) {
      console.error(
        `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes10.err}`,
      );
      throw new Error("Failed to get tss stage with session data");
    }

    const triplesStage10 = getTssStageWithSessionDataRes10.data;
    expect(triplesStage10).toBeDefined();
    expect(triplesStage10?.session_id).toEqual(sessionId);
    expect(triplesStage10?.stage_type).toEqual(TssStageType.TRIPLES);
    expect(triplesStage10?.stage_status).toEqual(TriplesStageStatus.STEP_10);
    expect(triplesStage10?.stage_data).toBeDefined();
    expect(triplesStage10?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(triplesStage10?.wallet_id).toEqual(wallet.wallet_id);

    // step 11
    const clientTriplesResult11 = napiRunTriples2ClientStep11(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult11.st_0;

    const triplesStep11Request: TriplesStep11Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      pub_v: clientTriplesResult11.pub_v,
    };

    const triplesStep11Response = await runTriplesStep11(
      pool,
      triplesStep11Request,
    );
    if (triplesStep11Response.success === false) {
      console.error(triplesStep11Response);
      throw new Error("Failed to run triples step 11");
    }

    expect(triplesStep11Response.success).toBe(true);
    expect(triplesStep11Response.data?.pub_v).toBeDefined();

    const getTssStageWithSessionDataRes11 = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes11.success === false) {
      console.error(
        `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes11.err}`,
      );
      throw new Error("Failed to get tss stage with session data");
    }

    const triplesStage11 = getTssStageWithSessionDataRes11.data;
    expect(triplesStage11).toBeDefined();
    expect(triplesStage11?.session_id).toEqual(sessionId);
    expect(triplesStage11?.stage_type).toEqual(TssStageType.TRIPLES);
    expect(triplesStage11?.stage_status).toEqual(TriplesStageStatus.COMPLETED);
    expect(triplesStage11?.stage_data).toBeDefined();
    expect(triplesStage11?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(triplesStage11?.wallet_id).toEqual(wallet.wallet_id);
  });

  it("run triples step 1 failure - unauthorized", async () => {
    const walletId = "550e8400-e29b-41d4-a716-446655440000";

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const clientTriplesResult = napiRunTriples2ClientStep1();
    const { msgs_1 } = clientTriplesResult;

    const triplesStep1Request: TriplesStep1Request = {
      email: "test@test.com",
      wallet_id: walletId,
      customer_id: customerId,
      msgs_1,
    };

    const triplesStep1Response = await runTriplesStep1(
      pool,
      triplesStep1Request,
    );
    if (triplesStep1Response.success === true) {
      throw new Error("triples step 1 should fail");
    }

    expect(triplesStep1Response.success).toBe(false);
    expect(triplesStep1Response.code).toBe("UNAUTHORIZED");
  });

  it("run triples step 2 failure - invalid tss session: not found session", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const sessionId = "110e8400-e29b-41d4-a716-446655440001";

    const triplesStep2Request: TriplesStep2Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      wait_1: [],
    };
    const triplesStep2Response = await runTriplesStep2(
      pool,
      triplesStep2Request,
    );
    if (triplesStep2Response.success === true) {
      throw new Error("triples step 2 should fail");
    }

    expect(triplesStep2Response.success).toBe(false);
    expect(triplesStep2Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 2 failure - invalid tss session: not match wallet", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const invalidWalletId = "110e8400-e29b-41d4-a716-446655440001";

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: invalidWalletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_1,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep2Request: TriplesStep2Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      wait_1: [],
    };
    const triplesStep2Response = await runTriplesStep2(
      pool,
      triplesStep2Request,
    );
    if (triplesStep2Response.success === true) {
      throw new Error("triples step 2 should fail");
    }

    expect(triplesStep2Response.success).toBe(false);
    expect(triplesStep2Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 2 failure - invalid tss stage", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: walletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_2,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep2Request: TriplesStep2Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      wait_1: [],
    };
    const triplesStep2Response = await runTriplesStep2(
      pool,
      triplesStep2Request,
    );
    if (triplesStep2Response.success === true) {
      throw new Error("triples step 2 should fail");
    }

    expect(triplesStep2Response.success).toBe(false);
    expect(triplesStep2Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run triples step 3 failure - invalid tss session: not found session", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const sessionId = "110e8400-e29b-41d4-a716-446655440001";

    const triplesStep3Request: TriplesStep3Request = {
      email,
      wallet_id: walletId,
      session_id: sessionId,
      wait_2: {
        big_e_i_v: [],
        big_f_i_v: [],
        big_l_i_v: [],
        my_randomizers: [],
        my_phi_proof0v: [],
        my_phi_proof1v: [],
      },
    };
    const triplesStep3Response = await runTriplesStep3(
      pool,
      triplesStep3Request,
    );
    if (triplesStep3Response.success === true) {
      throw new Error("triples step 3 should fail");
    }

    expect(triplesStep3Response.success).toBe(false);
    expect(triplesStep3Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 3 failure - invalid tss session: not match wallet", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const invalidWalletId = "110e8400-e29b-41d4-a716-446655440001";

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: invalidWalletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_2,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep3Request: TriplesStep3Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      wait_2: {
        big_e_i_v: [],
        big_f_i_v: [],
        big_l_i_v: [],
        my_randomizers: [],
        my_phi_proof0v: [],
        my_phi_proof1v: [],
      },
    };
    const triplesStep3Response = await runTriplesStep3(
      pool,
      triplesStep3Request,
    );
    if (triplesStep3Response.success === true) {
      throw new Error("triples step 3 should fail");
    }

    expect(triplesStep3Response.success).toBe(false);
    expect(triplesStep3Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 3 failure - invalid tss stage", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: walletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_3,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep3Request: TriplesStep3Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      wait_2: {
        big_e_i_v: [],
        big_f_i_v: [],
        big_l_i_v: [],
        my_randomizers: [],
        my_phi_proof0v: [],
        my_phi_proof1v: [],
      },
    };
    const triplesStep3Response = await runTriplesStep3(
      pool,
      triplesStep3Request,
    );
    if (triplesStep3Response.success === true) {
      throw new Error("triples step 3 should fail");
    }

    expect(triplesStep3Response.success).toBe(false);
    expect(triplesStep3Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run triples step 4 failure - invalid tss session: not found session", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const sessionId = "110e8400-e29b-41d4-a716-446655440001";

    const triplesStep4Request: TriplesStep4Request = {
      email,
      wallet_id: walletId,
      session_id: sessionId,
      wait_3: {
        a_i_j_v: [],
        b_i_j_v: [],
      },
    };
    const triplesStep4Response = await runTriplesStep4(
      pool,
      triplesStep4Request,
    );
    if (triplesStep4Response.success === true) {
      throw new Error("triples step 4 should fail");
    }

    expect(triplesStep4Response.success).toBe(false);
    expect(triplesStep4Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 4 failure - invalid tss session: not match wallet", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const invalidWalletId = "110e8400-e29b-41d4-a716-446655440001";

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: invalidWalletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_3,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep4Request: TriplesStep4Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      wait_3: {
        a_i_j_v: [],
        b_i_j_v: [],
      },
    };
    const triplesStep4Response = await runTriplesStep4(
      pool,
      triplesStep4Request,
    );
    if (triplesStep4Response.success === true) {
      throw new Error("triples step 4 should fail");
    }

    expect(triplesStep4Response.success).toBe(false);
    expect(triplesStep4Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 4 failure - invalid tss stage", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: walletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_4,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep4Request: TriplesStep4Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      wait_3: {
        a_i_j_v: [],
        b_i_j_v: [],
      },
    };
    const triplesStep4Response = await runTriplesStep4(
      pool,
      triplesStep4Request,
    );
    if (triplesStep4Response.success === true) {
      throw new Error("triples step 4 should fail");
    }

    expect(triplesStep4Response.success).toBe(false);
    expect(triplesStep4Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run triples step 5 failure - invalid tss session: not found session", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const sessionId = "110e8400-e29b-41d4-a716-446655440001";

    const triplesStep5Request: TriplesStep5Request = {
      email,
      wallet_id: walletId,
      session_id: sessionId,
      wait_4: {
        big_c_i_points: [],
        my_phi_proofs: [],
      },
    };
    const triplesStep5Response = await runTriplesStep5(
      pool,
      triplesStep5Request,
    );
    if (triplesStep5Response.success === true) {
      throw new Error("triples step 5 should fail");
    }

    expect(triplesStep5Response.success).toBe(false);
    expect(triplesStep5Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 5 failure - invalid tss session: not match wallet", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const invalidWalletId = "110e8400-e29b-41d4-a716-446655440001";

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: invalidWalletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_4,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep5Request: TriplesStep5Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      wait_4: {
        big_c_i_points: [],
        my_phi_proofs: [],
      },
    };
    const triplesStep5Response = await runTriplesStep5(
      pool,
      triplesStep5Request,
    );
    if (triplesStep5Response.success === true) {
      throw new Error("triples step 5 should fail");
    }

    expect(triplesStep5Response.success).toBe(false);
    expect(triplesStep5Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 5 failure - invalid tss stage", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: walletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_5,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep5Request: TriplesStep5Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      wait_4: {
        big_c_i_points: [],
        my_phi_proofs: [],
      },
    };
    const triplesStep5Response = await runTriplesStep5(
      pool,
      triplesStep5Request,
    );
    if (triplesStep5Response.success === true) {
      throw new Error("triples step 5 should fail");
    }

    expect(triplesStep5Response.success).toBe(false);
    expect(triplesStep5Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run triples step 6 failure - invalid tss session: not found session", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const sessionId = "110e8400-e29b-41d4-a716-446655440001";

    const triplesStep6Request: TriplesStep6Request = {
      email,
      wallet_id: walletId,
      session_id: sessionId,
      batch_random_ot_wait_0: [],
    };

    const triplesStep6Response = await runTriplesStep6(
      pool,
      triplesStep6Request,
    );
    if (triplesStep6Response.success === true) {
      throw new Error("triples step 6 should fail");
    }

    expect(triplesStep6Response.success).toBe(false);
    expect(triplesStep6Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 6 failure - invalid tss session: not match wallet", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const invalidWalletId = "110e8400-e29b-41d4-a716-446655440001";

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: invalidWalletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_5,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep6Request: TriplesStep6Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      batch_random_ot_wait_0: [],
    };
    const triplesStep6Response = await runTriplesStep6(
      pool,
      triplesStep6Request,
    );
    if (triplesStep6Response.success === true) {
      throw new Error("triples step 6 should fail");
    }

    expect(triplesStep6Response.success).toBe(false);
    expect(triplesStep6Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 6 failure - invalid tss stage", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: walletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_6,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep6Request: TriplesStep6Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      batch_random_ot_wait_0: [],
    };
    const triplesStep6Response = await runTriplesStep6(
      pool,
      triplesStep6Request,
    );
    if (triplesStep6Response.success === true) {
      throw new Error("triples step 6 should fail");
    }

    expect(triplesStep6Response.success).toBe(false);
    expect(triplesStep6Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run triples step 7 failure - invalid tss session: not found session", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const sessionId = "110e8400-e29b-41d4-a716-446655440001";

    const triplesStep7Request: TriplesStep7Request = {
      email,
      wallet_id: walletId,
      session_id: sessionId,
      correlated_ot_wait_0: [],
    };

    const triplesStep7Response = await runTriplesStep7(
      pool,
      triplesStep7Request,
    );
    if (triplesStep7Response.success === true) {
      throw new Error("triples step 7 should fail");
    }

    expect(triplesStep7Response.success).toBe(false);
    expect(triplesStep7Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 7 failure - invalid tss session: not match wallet", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const invalidWalletId = "110e8400-e29b-41d4-a716-446655440001";

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: invalidWalletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_6,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep7Request: TriplesStep7Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      correlated_ot_wait_0: [],
    };
    const triplesStep7Response = await runTriplesStep7(
      pool,
      triplesStep7Request,
    );
    if (triplesStep7Response.success === true) {
      throw new Error("triples step 7 should fail");
    }

    expect(triplesStep7Response.success).toBe(false);
    expect(triplesStep7Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 7 failure - invalid tss stage", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: walletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_7,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep7Request: TriplesStep7Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      correlated_ot_wait_0: [],
    };
    const triplesStep7Response = await runTriplesStep7(
      pool,
      triplesStep7Request,
    );
    if (triplesStep7Response.success === true) {
      throw new Error("triples step 7 should fail");
    }

    expect(triplesStep7Response.success).toBe(false);
    expect(triplesStep7Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run triples step 8 failure - invalid tss session: not found session", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const sessionId = "110e8400-e29b-41d4-a716-446655440001";

    const triplesStep8Request: TriplesStep8Request = {
      email,
      wallet_id: walletId,
      session_id: sessionId,
      random_ot_extension_wait_1: [],
    };

    const triplesStep8Response = await runTriplesStep8(
      pool,
      triplesStep8Request,
    );
    if (triplesStep8Response.success === true) {
      throw new Error("triples step 8 should fail");
    }

    expect(triplesStep8Response.success).toBe(false);
    expect(triplesStep8Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 8 failure - invalid tss session: not match wallet", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const invalidWalletId = "110e8400-e29b-41d4-a716-446655440001";

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: invalidWalletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_7,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep8Request: TriplesStep8Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      random_ot_extension_wait_1: [],
    };
    const triplesStep8Response = await runTriplesStep8(
      pool,
      triplesStep8Request,
    );
    if (triplesStep8Response.success === true) {
      throw new Error("triples step 8 should fail");
    }

    expect(triplesStep8Response.success).toBe(false);
    expect(triplesStep8Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 8 failure - invalid tss stage", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: walletId,
      customer_id: customerId,
    });

    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_8,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep8Request: TriplesStep8Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      random_ot_extension_wait_1: [],
    };
    const triplesStep8Response = await runTriplesStep8(
      pool,
      triplesStep8Request,
    );
    if (triplesStep8Response.success === true) {
      throw new Error("triples step 8 should fail");
    }

    expect(triplesStep8Response.success).toBe(false);
    expect(triplesStep8Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run triples step 9 failure - invalid tss session: not found session", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const sessionId = "110e8400-e29b-41d4-a716-446655440001";

    const triplesStep9Request: TriplesStep9Request = {
      email,
      wallet_id: walletId,
      session_id: sessionId,
      mta_wait_1: {
        chi1_seed_1_v: [],
        chi1_seed_2_v: [],
      },
    };

    const triplesStep9Response = await runTriplesStep9(
      pool,
      triplesStep9Request,
    );
    if (triplesStep9Response.success === true) {
      throw new Error("triples step 9 should fail");
    }

    expect(triplesStep9Response.success).toBe(false);
    expect(triplesStep9Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 9 failure - invalid tss session: not match wallet", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const invalidWalletId = "110e8400-e29b-41d4-a716-446655440001";

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: invalidWalletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_8,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep9Request: TriplesStep9Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      mta_wait_1: {
        chi1_seed_1_v: [],
        chi1_seed_2_v: [],
      },
    };
    const triplesStep9Response = await runTriplesStep9(
      pool,
      triplesStep9Request,
    );
    if (triplesStep9Response.success === true) {
      throw new Error("triples step 9 should fail");
    }

    expect(triplesStep9Response.success).toBe(false);
    expect(triplesStep9Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 9 failure - invalid tss stage", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: walletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_9,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep9Request: TriplesStep9Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      mta_wait_1: {
        chi1_seed_1_v: [],
        chi1_seed_2_v: [],
      },
    };
    const triplesStep9Response = await runTriplesStep9(
      pool,
      triplesStep9Request,
    );
    if (triplesStep9Response.success === true) {
      throw new Error("triples step 9 should fail");
    }

    expect(triplesStep9Response.success).toBe(false);
    expect(triplesStep9Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run triples step 10 failure - invalid tss session: not found session", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const sessionId = "110e8400-e29b-41d4-a716-446655440001";

    const triplesStep10Request: TriplesStep10Request = {
      email,
      wallet_id: walletId,
      session_id: sessionId,
      wait_5: {
        hat_big_c_i_points: [],
        my_phi_proofs: [],
      },
      wait_6: {
        c_i_j_v: [],
      },
    };

    const triplesStep10Response = await runTriplesStep10(
      pool,
      triplesStep10Request,
    );
    if (triplesStep10Response.success === true) {
      throw new Error("triples step 10 should fail");
    }

    expect(triplesStep10Response.success).toBe(false);
    expect(triplesStep10Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 10 failure - invalid tss session: not match wallet", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const invalidWalletId = "110e8400-e29b-41d4-a716-446655440001";

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: invalidWalletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_9,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep10Request: TriplesStep10Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      wait_5: {
        hat_big_c_i_points: [],
        my_phi_proofs: [],
      },
      wait_6: {
        c_i_j_v: [],
      },
    };
    const triplesStep10Response = await runTriplesStep10(
      pool,
      triplesStep10Request,
    );
    if (triplesStep10Response.success === true) {
      throw new Error("triples step 10 should fail");
    }

    expect(triplesStep10Response.success).toBe(false);
    expect(triplesStep10Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 10 failure - invalid tss stage", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: walletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_10,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep10Request: TriplesStep10Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      wait_5: {
        hat_big_c_i_points: [],
        my_phi_proofs: [],
      },
      wait_6: {
        c_i_j_v: [],
      },
    };
    const triplesStep10Response = await runTriplesStep10(
      pool,
      triplesStep10Request,
    );
    if (triplesStep10Response.success === true) {
      throw new Error("triples step 10 should fail");
    }

    expect(triplesStep10Response.success).toBe(false);
    expect(triplesStep10Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run triples step 11 failure - invalid tss session: not found session", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const sessionId = "110e8400-e29b-41d4-a716-446655440001";

    const triplesStep11Request: TriplesStep11Request = {
      email,
      wallet_id: walletId,
      session_id: sessionId,
      pub_v: [],
    };

    const triplesStep11Response = await runTriplesStep11(
      pool,
      triplesStep11Request,
    );
    if (triplesStep11Response.success === true) {
      throw new Error("triples step 11 should fail");
    }

    expect(triplesStep11Response.success).toBe(false);
    expect(triplesStep11Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 11 failure - invalid tss session: not match wallet", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;
    const invalidWalletId = "110e8400-e29b-41d4-a716-446655440001";

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: invalidWalletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }

    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_10,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep11Request: TriplesStep11Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      pub_v: [],
    };
    const triplesStep11Response = await runTriplesStep11(
      pool,
      triplesStep11Request,
    );
    if (triplesStep11Response.success === true) {
      throw new Error("triples step 11 should fail");
    }

    expect(triplesStep11Response.success).toBe(false);
    expect(triplesStep11Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run triples step 11 failure - invalid tss stage", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const walletId = wallet.wallet_id;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const createTssSessionRes = await createTssSession(pool, {
      wallet_id: walletId,
      customer_id: customerId,
    });
    if (createTssSessionRes.success === false) {
      console.error(createTssSessionRes.err);
      throw new Error("Failed to create tss session");
    }
    const session = createTssSessionRes.data;

    const createTssStageRes = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.COMPLETED,
      stage_data: {
        triple_state: null,
        triple_messages: null,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const triplesStep11Request: TriplesStep11Request = {
      email,
      wallet_id: walletId,
      session_id: session.session_id,
      pub_v: [],
    };
    const triplesStep11Response = await runTriplesStep11(
      pool,
      triplesStep11Request,
    );
    if (triplesStep11Response.success === true) {
      throw new Error("triples step 11 should fail");
    }

    expect(triplesStep11Response.success).toBe(false);
    expect(triplesStep11Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run triples step 11 failure - invalid tss triples result", async () => {
    const email = "test@test.com";
    const clientKeygenResult = napiRunKeygenClientCentralized();
    const { keygen_outputs } = clientKeygenResult;
    const keygen_2 = keygen_outputs[Participant.P1];

    const createUserRes = await createUser(pool, email, "google");
    if (createUserRes.success === false) {
      console.error(createUserRes.err);
      throw new Error("Failed to create user");
    }
    const user = createUserRes.data;

    const createWalletRes = await createWallet(pool, {
      user_id: user.user_id,
      curve_type: "secp256k1",
      public_key: Buffer.from(keygen_2.public_key, "hex"),
      enc_tss_share: Buffer.from(keygen_2.private_share, "hex"),
      status: "ACTIVE" as WalletStatus,
      sss_threshold: SSS_THRESHOLD,
    });
    if (createWalletRes.success === false) {
      console.error(createWalletRes.err);
      throw new Error("Failed to create wallet");
    }
    const wallet = createWalletRes.data;

    const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
    if (insertCustomerRes.success === false) {
      console.error(insertCustomerRes.err);
      throw new Error("Failed to insert customer");
    }
    const customerId = insertCustomerRes.data.customer_id;

    const clientTriplesState: TECDSATriplesState = {
      triplesState: null,
      triplesMessages: null,
      triple0Pub: null,
      triple1Pub: null,
      triple0Share: null,
      triple1Share: null,
    };

    // step 1
    const clientTriplesResult1 = napiRunTriples2ClientStep1();
    clientTriplesState.triplesState = clientTriplesResult1.st_0;

    const triplesStep1Request: TriplesStep1Request = {
      email,
      wallet_id: wallet.wallet_id,
      customer_id: customerId,
      msgs_1: clientTriplesResult1.msgs_1,
    };

    const triplesStep1Response = await runTriplesStep1(
      pool,
      triplesStep1Request,
    );
    if (triplesStep1Response.success === false) {
      console.error(triplesStep1Response);
      throw new Error("Failed to run triples step 1");
    }
    clientTriplesState.triplesMessages = triplesStep1Response.data?.msgs_0;
    const sessionId = triplesStep1Response.data?.session_id;

    // step 2
    const clientTriplesResult2 = napiRunTriples2ClientStep2(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult2.st_0;

    const triplesStep2Request: TriplesStep2Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      wait_1: clientTriplesResult2.msgs_1.wait_1[Participant.P0],
    };

    const triplesStep2Response = await runTriplesStep2(
      pool,
      triplesStep2Request,
    );
    if (triplesStep2Response.success === false) {
      console.error(triplesStep2Response);
      throw new Error("Failed to run triples step 2");
    }
    clientTriplesState.triplesMessages!.wait_1[Participant.P1] =
      triplesStep2Response.data?.wait_1;

    // step 3
    const clientTriplesResult3 = napiRunTriples2ClientStep3(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult3.st_0;

    const triplesStep3Request: TriplesStep3Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      wait_2: clientTriplesResult3.msgs_1.wait_2[Participant.P0],
    };

    const triplesStep3Response = await runTriplesStep3(
      pool,
      triplesStep3Request,
    );
    if (triplesStep3Response.success === false) {
      console.error(triplesStep3Response);
      throw new Error("Failed to run triples step 3");
    }
    clientTriplesState.triplesMessages!.wait_2[Participant.P1] =
      triplesStep3Response.data?.wait_2;

    // step 4
    const clientTriplesResult4 = napiRunTriples2ClientStep4(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult4.st_0;

    const triplesStep4Request: TriplesStep4Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      wait_3: clientTriplesResult4.msgs_1.wait_3[Participant.P0],
    };

    const triplesStep4Response = await runTriplesStep4(
      pool,
      triplesStep4Request,
    );
    if (triplesStep4Response.success === false) {
      console.error(triplesStep4Response);
      throw new Error("Failed to run triples step 4");
    }
    clientTriplesState.triplesMessages!.wait_3[Participant.P1] =
      triplesStep4Response.data?.wait_3;

    // step 5
    const clientTriplesResult5 = napiRunTriples2ClientStep5(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult5.st_0;

    const triplesStep5Request: TriplesStep5Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      wait_4: clientTriplesResult5.msgs_1.wait_4[Participant.P0],
    };

    const triplesStep5Response = await runTriplesStep5(
      pool,
      triplesStep5Request,
    );
    if (triplesStep5Response.success === false) {
      console.error(triplesStep5Response);
      throw new Error("Failed to run triples step 5");
    }
    clientTriplesState.triplesMessages!.wait_4[Participant.P1] =
      triplesStep5Response.data?.wait_4;

    // step 6
    const clientTriplesResult6 = napiRunTriples2ClientStep6(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult6.st_0;

    const triplesStep6Request: TriplesStep6Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      batch_random_ot_wait_0:
        clientTriplesResult6.msgs_1.batch_random_ot_wait_0[Participant.P0],
    };

    const triplesStep6Response = await runTriplesStep6(
      pool,
      triplesStep6Request,
    );
    if (triplesStep6Response.success === false) {
      console.error(triplesStep6Response);
      throw new Error("Failed to run triples step 6");
    }
    clientTriplesState.triplesMessages!.batch_random_ot_wait_0[Participant.P1] =
      triplesStep6Response.data?.batch_random_ot_wait_0;

    // step 7
    const clientTriplesResult7 = napiRunTriples2ClientStep7(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult7.st_0;

    const triplesStep7Request: TriplesStep7Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      correlated_ot_wait_0:
        clientTriplesResult7.msgs_1.correlated_ot_wait_0[Participant.P0],
    };

    const triplesStep7Response = await runTriplesStep7(
      pool,
      triplesStep7Request,
    );
    if (triplesStep7Response.success === false) {
      console.error(triplesStep7Response);
      throw new Error("Failed to run triples step 7");
    }
    clientTriplesState.triplesMessages!.random_ot_extension_wait_0[
      Participant.P1
    ] = triplesStep7Response.data?.random_ot_extension_wait_0;

    // step 8
    const clientTriplesResult8 = napiRunTriples2ClientStep8(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult8.st_0;

    const triplesStep8Request: TriplesStep8Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      random_ot_extension_wait_1:
        clientTriplesResult8.msgs_1.random_ot_extension_wait_1[Participant.P0],
    };

    const triplesStep8Response = await runTriplesStep8(
      pool,
      triplesStep8Request,
    );
    if (triplesStep8Response.success === false) {
      console.error(triplesStep8Response);
      throw new Error("Failed to run triples step 8");
    }
    clientTriplesState.triplesMessages!.mta_wait_0[Participant.P1] =
      triplesStep8Response.data?.mta_wait_0;

    // step 9
    const clientTriplesResult9 = napiRunTriples2ClientStep9(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult9.st_0;

    const triplesStep9Request: TriplesStep9Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      mta_wait_1: clientTriplesResult9.msgs_1.mta_wait_1[Participant.P0],
    };

    const triplesStep9Response = await runTriplesStep9(
      pool,
      triplesStep9Request,
    );
    if (triplesStep9Response.success === false) {
      console.error(triplesStep9Response);
      throw new Error("Failed to run triples step 9");
    }

    // step 10
    const clientTriplesResult10 = napiRunTriples2ClientStep10(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult10.st_0;

    const triplesStep10Request: TriplesStep10Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      wait_5: clientTriplesResult10.msgs_1.wait_5[Participant.P0],
      wait_6: clientTriplesResult10.msgs_1.wait_6[Participant.P0],
    };

    const triplesStep10Response = await runTriplesStep10(
      pool,
      triplesStep10Request,
    );
    if (triplesStep10Response.success === false) {
      console.error(triplesStep10Response);
      throw new Error("Failed to run triples step 10");
    }
    clientTriplesState.triplesMessages!.wait_5[Participant.P1] =
      triplesStep10Response.data?.wait_5;
    clientTriplesState.triplesMessages!.wait_6[Participant.P1] =
      triplesStep10Response.data?.wait_6;

    // step 11
    const clientTriplesResult11 = napiRunTriples2ClientStep11(
      clientTriplesState.triplesState,
      clientTriplesState.triplesMessages,
    );
    clientTriplesState.triplesState = clientTriplesResult11.st_0;

    const triplesStep11Request: TriplesStep11Request = {
      email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      pub_v: [
        {
          big_a: "1",
          big_b: "2",
          big_c: "3",
          participants: [Participant.P0, Participant.P1],
          threshold: 2,
        },
      ],
    };

    const triplesStep11Response = await runTriplesStep11(
      pool,
      triplesStep11Request,
    );
    if (triplesStep11Response.success === true) {
      throw new Error("triples step 11 should fail");
    }

    expect(triplesStep11Response.success).toBe(false);
    expect(triplesStep11Response.code).toBe("INVALID_TSS_TRIPLES_RESULT");
  });
});
