import { jest } from "@jest/globals";
import { Pool } from "pg";
import type { Logger } from "winston";
import type {
  KeygenRequest,
  PresignStep1Request,
  PresignStep2Request,
  PresignStep3Request,
  SignStep1Request,
  SignStep2Request,
  TriplesStep10Request,
  TriplesStep11Request,
  TriplesStep1Request,
  TriplesStep2Request,
  TriplesStep3Request,
  TriplesStep4Request,
  TriplesStep5Request,
  TriplesStep6Request,
  TriplesStep7Request,
  TriplesStep8Request,
  TriplesStep9Request,
} from "@oko-wallet/oko-types/tss";
import {
  PresignStageStatus,
  SignStageStatus,
  TriplesStageStatus,
  TssSessionState,
  TssStageType,
} from "@oko-wallet/oko-types/tss";
import type {
  TECDSAPresignState,
  TECDSASignState,
  TECDSATriplesState,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";
import {
  napiRunKeygenClientCentralized,
  napiRunPresignClientStep1,
  napiRunPresignClientStep2,
  napiRunPresignClientStep3,
  napiRunSignClientStep1V2,
  napiRunSignClientStep2,
  napiRunTriples2ClientStep1,
  napiRunTriples2ClientStep10,
  napiRunTriples2ClientStep11,
  napiRunTriples2ClientStep2,
  napiRunTriples2ClientStep3,
  napiRunTriples2ClientStep4,
  napiRunTriples2ClientStep5,
  napiRunTriples2ClientStep6,
  napiRunTriples2ClientStep7,
  napiRunTriples2ClientStep8,
  napiRunTriples2ClientStep9,
} from "@oko-wallet/cait-sith-keplr-addon/addon";
import {
  createTssSession,
  createTssStage,
  getTssStageWithSessionData,
} from "@oko-wallet/oko-pg-interface/tss";
import { createPgConn } from "@oko-wallet/postgres-lib";
import type { WalletStatus } from "@oko-wallet/oko-types/wallets";
import { insertKSNode } from "@oko-wallet/oko-pg-interface/ks_nodes";
import { insertCustomer } from "@oko-wallet/oko-pg-interface/customers";
import { createWallet } from "@oko-wallet/oko-pg-interface/oko_wallets";
import { createUser } from "@oko-wallet/oko-pg-interface/oko_users";
import { insertKeyShareNodeMeta } from "@oko-wallet/oko-pg-interface/key_share_node_meta";

import { resetPgDatabase } from "@oko-wallet-api/testing/database";
import { testPgConfig } from "@oko-wallet-api/database/test_config";
import {
  runTriplesStep1,
  runTriplesStep10,
  runTriplesStep11,
  runTriplesStep2,
  runTriplesStep3,
  runTriplesStep4,
  runTriplesStep5,
  runTriplesStep6,
  runTriplesStep7,
  runTriplesStep8,
  runTriplesStep9,
} from "@oko-wallet-api/api/tss/v1/triples";
import {
  runPresignStep1,
  runPresignStep2,
  runPresignStep3,
} from "@oko-wallet-api/api/tss/v1/presign";
import { runSignStep1, runSignStep2 } from "@oko-wallet-api/api/tss/v1/sign";
import { TEMP_ENC_SECRET } from "@oko-wallet-api/api/tss/utils";
import { TEST_CUSTOMER } from "@oko-wallet-api/api/tss/tests";

const mockCheckKeyShareFromKSNodes = jest.fn() as jest.Mock;
const mockCheckKeyShareFromKSNodesV2 = jest.fn() as jest.Mock;

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

await jest.unstable_mockModule("@oko-wallet-api/api/tss/ks_node", () => ({
  checkKeyShareFromKSNodes: mockCheckKeyShareFromKSNodes,
  checkKeyShareFromKSNodesV2: mockCheckKeyShareFromKSNodesV2,
}));

const { runKeygen } = await import("@oko-wallet-api/api/tss/v1/keygen");

const SSS_THRESHOLD = 2;

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

async function setUpTssStage(pool: Pool) {
  // keygen
  const email = "test@test.com";
  const clientKeygenResult = napiRunKeygenClientCentralized();
  const { keygen_outputs } = clientKeygenResult;
  const keygen_2 = keygen_outputs[Participant.P1];

  const ksNodeIds = await setUpKSNodes(pool);
  (mockCheckKeyShareFromKSNodes as any).mockResolvedValue({
    success: true,
    data: {
      nodeIds: ksNodeIds,
    },
  });

  await insertKeyShareNodeMeta(pool, {
    sss_threshold: SSS_THRESHOLD,
  });

  const keygenRequest: KeygenRequest = {
    auth_type: "google",
    user_identifier: email,
    email: email,
    keygen_2,
  };
  const keygenResponse = await runKeygen(
    pool,
    {
      secret: "test-jwt-secret",
      expires_in: "1h",
    },
    keygenRequest,
    TEMP_ENC_SECRET,
    mockLogger,
  );
  if (keygenResponse.success === false) {
    console.error(keygenResponse);
    throw new Error("Failed to run keygen");
  }
  const walletId = keygenResponse.data?.user.wallet_id;
  const keygen0 = keygen_outputs[Participant.P0];

  const insertCustomerRes = await insertCustomer(pool, TEST_CUSTOMER);
  if (insertCustomerRes.success === false) {
    console.error(insertCustomerRes.err);
    throw new Error("Failed to insert customer");
  }
  const customerId = insertCustomerRes.data.customer_id;

  // triples
  const clientTriplesState: TECDSATriplesState = {
    triplesState: null,
    triplesMessages: null,
    triple0Pub: null,
    triple1Pub: null,
    triple0Share: null,
    triple1Share: null,
  };
  const clientTriplesResult1 = napiRunTriples2ClientStep1();
  clientTriplesState.triplesState = clientTriplesResult1.st_0;
  const triplesStep1Request: TriplesStep1Request = {
    email: email,
    wallet_id: walletId,
    customer_id: customerId,
    msgs_1: clientTriplesResult1.msgs_1,
  };
  const triplesStep1Response = await runTriplesStep1(pool, triplesStep1Request);
  if (triplesStep1Response.success === false) {
    console.error(triplesStep1Response);
    throw new Error("Failed to run triples step 1");
  }
  clientTriplesState.triplesMessages = triplesStep1Response.data?.msgs_0;
  const sessionId = triplesStep1Response.data?.session_id;

  const clientTriplesResult2 = napiRunTriples2ClientStep2(
    clientTriplesState.triplesState,
    clientTriplesState.triplesMessages,
  );
  clientTriplesState.triplesState = clientTriplesResult2.st_0;
  const triplesStep2Request: TriplesStep2Request = {
    email: email,
    wallet_id: walletId,
    session_id: sessionId,
    wait_1: clientTriplesResult2.msgs_1.wait_1[Participant.P0],
  };
  const triplesStep2Response = await runTriplesStep2(pool, triplesStep2Request);
  if (triplesStep2Response.success === false) {
    console.error(triplesStep2Response);
    throw new Error("Failed to run triples step 2");
  }
  clientTriplesState.triplesMessages!.wait_1[Participant.P1] =
    triplesStep2Response.data?.wait_1;

  const clientTriplesResult3 = napiRunTriples2ClientStep3(
    clientTriplesState.triplesState,
    clientTriplesState.triplesMessages,
  );
  clientTriplesState.triplesState = clientTriplesResult3.st_0;
  const triplesStep3Request: TriplesStep3Request = {
    email: email,
    wallet_id: walletId,
    session_id: sessionId,
    wait_2: clientTriplesResult3.msgs_1.wait_2[Participant.P0],
  };
  const triplesStep3Response = await runTriplesStep3(pool, triplesStep3Request);
  if (triplesStep3Response.success === false) {
    console.error(triplesStep3Response);
    throw new Error("Failed to run triples step 3");
  }
  clientTriplesState.triplesMessages!.wait_2[Participant.P1] =
    triplesStep3Response.data?.wait_2;

  const clientTriplesResult4 = napiRunTriples2ClientStep4(
    clientTriplesState.triplesState,
    clientTriplesState.triplesMessages,
  );
  clientTriplesState.triplesState = clientTriplesResult4.st_0;
  const triplesStep4Request: TriplesStep4Request = {
    email: email,
    wallet_id: walletId,
    session_id: sessionId,
    wait_3: clientTriplesResult4.msgs_1.wait_3[Participant.P0],
  };
  const triplesStep4Response = await runTriplesStep4(pool, triplesStep4Request);
  if (triplesStep4Response.success === false) {
    console.error(triplesStep4Response.msg);
    throw new Error("Failed to run triples step 4");
  }
  clientTriplesState.triplesMessages!.wait_3[Participant.P1] =
    triplesStep4Response.data?.wait_3;

  const clientTriplesResult5 = napiRunTriples2ClientStep5(
    clientTriplesState.triplesState,
    clientTriplesState.triplesMessages,
  );
  clientTriplesState.triplesState = clientTriplesResult5.st_0;
  const triplesStep5Request: TriplesStep5Request = {
    email: email,
    wallet_id: walletId,
    session_id: sessionId,
    wait_4: clientTriplesResult5.msgs_1.wait_4[Participant.P0],
  };
  const triplesStep5Response = await runTriplesStep5(pool, triplesStep5Request);
  if (triplesStep5Response.success === false) {
    console.error(triplesStep5Response.msg);
    throw new Error("Failed to run triples step 5");
  }
  clientTriplesState.triplesMessages!.wait_4[Participant.P1] =
    triplesStep5Response.data?.wait_4;

  const clientTriplesResult6 = napiRunTriples2ClientStep6(
    clientTriplesState.triplesState,
    clientTriplesState.triplesMessages,
  );
  clientTriplesState.triplesState = clientTriplesResult6.st_0;
  const triplesStep6Request: TriplesStep6Request = {
    email: email,
    wallet_id: walletId,
    session_id: sessionId,
    batch_random_ot_wait_0:
      clientTriplesResult6.msgs_1.batch_random_ot_wait_0[Participant.P0],
  };
  const triplesStep6Response = await runTriplesStep6(pool, triplesStep6Request);
  if (triplesStep6Response.success === false) {
    console.error(triplesStep6Response.msg);
    throw new Error("Failed to run triples step 6");
  }
  clientTriplesState.triplesMessages!.batch_random_ot_wait_0[Participant.P1] =
    triplesStep6Response.data?.batch_random_ot_wait_0;

  const clientTriplesResult7 = napiRunTriples2ClientStep7(
    clientTriplesState.triplesState,
    clientTriplesState.triplesMessages,
  );
  clientTriplesState.triplesState = clientTriplesResult7.st_0;
  const triplesStep7Request: TriplesStep7Request = {
    email: email,
    wallet_id: walletId,
    session_id: sessionId,
    correlated_ot_wait_0:
      clientTriplesResult7.msgs_1.correlated_ot_wait_0[Participant.P0],
  };
  const triplesStep7Response = await runTriplesStep7(pool, triplesStep7Request);
  if (triplesStep7Response.success === false) {
    console.error(triplesStep7Response);
    throw new Error("Failed to run triples step 7");
  }
  clientTriplesState.triplesMessages!.random_ot_extension_wait_0[
    Participant.P1
  ] = triplesStep7Response.data?.random_ot_extension_wait_0;

  const clientTriplesResult8 = napiRunTriples2ClientStep8(
    clientTriplesState.triplesState,
    clientTriplesState.triplesMessages,
  );
  clientTriplesState.triplesState = clientTriplesResult8.st_0;
  const triplesStep8Request: TriplesStep8Request = {
    email: email,
    wallet_id: walletId,
    session_id: sessionId,
    random_ot_extension_wait_1:
      clientTriplesResult8.msgs_1.random_ot_extension_wait_1[Participant.P0],
  };
  const triplesStep8Response = await runTriplesStep8(pool, triplesStep8Request);
  if (triplesStep8Response.success === false) {
    console.error(triplesStep8Response);
    throw new Error("Failed to run triples step 8");
  }
  clientTriplesState.triplesMessages!.mta_wait_0[Participant.P1] =
    triplesStep8Response.data?.mta_wait_0;

  const clientTriplesResult9 = napiRunTriples2ClientStep9(
    clientTriplesState.triplesState,
    clientTriplesState.triplesMessages,
  );
  clientTriplesState.triplesState = clientTriplesResult9.st_0;
  const triplesStep9Request: TriplesStep9Request = {
    email: email,
    wallet_id: walletId,
    session_id: sessionId,
    mta_wait_1: clientTriplesResult9.msgs_1.mta_wait_1[Participant.P0],
  };
  const triplesStep9Response = await runTriplesStep9(pool, triplesStep9Request);
  if (triplesStep9Response.success === false) {
    console.error(triplesStep9Response);
    throw new Error("Failed to run triples step 9");
  }

  const clientTriplesResult10 = napiRunTriples2ClientStep10(
    clientTriplesState.triplesState,
    clientTriplesState.triplesMessages,
  );
  clientTriplesState.triplesState = clientTriplesResult10.st_0;
  const triplesStep10Request: TriplesStep10Request = {
    email: email,
    wallet_id: walletId,
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

  const clientTriplesResult11 = napiRunTriples2ClientStep11(
    clientTriplesState.triplesState,
    clientTriplesState.triplesMessages,
  );
  clientTriplesState.triplesState = clientTriplesResult11.st_0;
  clientTriplesState.triple0Pub = clientTriplesResult11.pub_v[0];
  clientTriplesState.triple1Pub = clientTriplesResult11.pub_v[1];
  clientTriplesState.triple0Share = clientTriplesResult11.share_v[0];
  clientTriplesState.triple1Share = clientTriplesResult11.share_v[1];

  const triplesStep11Request: TriplesStep11Request = {
    email: email,
    wallet_id: walletId,
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

  // presign
  const clientPresignState: TECDSAPresignState = {
    presignState: null,
    presignMessages: null,
    presignOutput: null,
  };
  const clientPresignResult1 = napiRunPresignClientStep1(
    clientTriplesState.triple0Pub,
    clientTriplesState.triple1Pub,
    clientTriplesState.triple0Share,
    clientTriplesState.triple1Share,
    keygen0,
  );
  clientPresignState.presignState = clientPresignResult1.st_0;

  const presignStep1Request: PresignStep1Request = {
    email: email,
    wallet_id: walletId,
    session_id: sessionId,
    msgs_1: clientPresignResult1.msgs_1,
  };
  const presignStep1Response = await runPresignStep1(
    pool,
    presignStep1Request,
    TEMP_ENC_SECRET,
  );
  if (presignStep1Response.success === false) {
    console.error(presignStep1Response);
    throw new Error("Failed to run presign step 1");
  }
  clientPresignState.presignMessages = presignStep1Response.data?.msgs_0;

  const clientPresignResult2 = napiRunPresignClientStep2(
    clientPresignState.presignState,
  );
  clientPresignState.presignState = clientPresignResult2.st_0;

  const presignStep2Request: PresignStep2Request = {
    email: email,
    wallet_id: walletId,
    session_id: sessionId,
    wait_1_0_1: clientPresignResult2.msgs_1.wait_1[Participant.P0],
  };
  const presignStep2Response = await runPresignStep2(pool, presignStep2Request);
  if (presignStep2Response.success === false) {
    console.error(presignStep2Response);
    throw new Error("Failed to run presign step 2");
  }
  clientPresignState.presignMessages!.wait_1[Participant.P1] =
    presignStep2Response.data?.wait_1_1_0;

  const clientPresignResult3 = napiRunPresignClientStep3(
    clientPresignState.presignState,
    clientPresignState.presignMessages,
  );
  clientPresignState.presignState = clientPresignResult3.st_0;

  const presignStep3Request: PresignStep3Request = {
    email: email,
    wallet_id: walletId,
    session_id: sessionId,
    presign_big_r: clientPresignResult3.big_r,
  };
  const presignStep3Response = await runPresignStep3(pool, presignStep3Request);
  if (presignStep3Response.success === false) {
    console.error(presignStep3Response);
    throw new Error("Failed to run presign step 3");
  }
  clientPresignState.presignOutput = clientPresignResult3;

  return {
    email,
    walletId,
    sessionId,
    keygen0,
    clientTriplesState,
    clientPresignState,
  };
}

describe("sign_test_1", () => {
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
  });

  it("run sign success", async () => {
    const { email, walletId, sessionId, clientPresignState } =
      await setUpTssStage(pool);

    const clientSignState: TECDSASignState = {
      signState: null,
      signMessages: null,
    };
    const msg = crypto.getRandomValues(new Uint8Array(32));

    // step 1
    const clientSignResult1 = napiRunSignClientStep1V2(
      msg,
      clientPresignState.presignOutput,
    );
    clientSignState.signState = clientSignResult1.st_0;

    const signStep1Request: SignStep1Request = {
      email: email,
      wallet_id: walletId,
      session_id: sessionId,
      msg: Array.from(msg),
      msgs_1: clientSignResult1.msgs_1,
    };
    const signStep1Response = await runSignStep1(pool, signStep1Request);
    if (signStep1Response.success === false) {
      console.error(signStep1Response);
      throw new Error("Failed to run sign step 1");
    }
    clientSignState.signMessages = signStep1Response.data?.msgs_0;

    expect(signStep1Response.success).toBe(true);
    expect(clientSignState.signMessages).toBeDefined();

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.SIGN,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      console.error(getTssStageWithSessionDataRes.err);
      throw new Error("Failed to get tss stage with session data");
    }

    const signStage = getTssStageWithSessionDataRes.data;
    expect(signStage).toBeDefined();
    expect(signStage?.session_id).toEqual(sessionId);
    expect(signStage?.stage_type).toEqual(TssStageType.SIGN);
    expect(signStage?.stage_status).toEqual(SignStageStatus.STEP_1);
    expect(signStage?.stage_data).toBeDefined();
    expect(signStage?.session_state).toEqual(TssSessionState.IN_PROGRESS);
    expect(signStage?.wallet_id).toEqual(walletId);

    // step 2
    const clientSignResult2 = napiRunSignClientStep2(
      clientSignState.signState,
      clientSignState.signMessages,
      clientPresignState.presignOutput,
    );

    const signStep2Request: SignStep2Request = {
      email: email,
      wallet_id: walletId,
      session_id: sessionId,
      sign_output: clientSignResult2,
    };
    const signStep2Response = await runSignStep2(pool, signStep2Request);
    if (signStep2Response.success === false) {
      console.error(signStep2Response);
      throw new Error("Failed to run sign step 2");
    }

    expect(signStep2Response.success).toBe(true);
    expect(signStep2Response.data?.sign_output).toBeDefined();

    const getTssStageWithSessionDataRes2 = await getTssStageWithSessionData(
      pool,
      sessionId,
      TssStageType.SIGN,
    );
    if (getTssStageWithSessionDataRes2.success === false) {
      console.error(getTssStageWithSessionDataRes2.err);
      throw new Error("Failed to get tss stage with session data");
    }

    const signStage2 = getTssStageWithSessionDataRes2.data;
    expect(signStage2).toBeDefined();
    expect(signStage2?.session_id).toEqual(sessionId);
    expect(signStage2?.stage_type).toEqual(TssStageType.SIGN);
    expect(signStage2?.stage_status).toEqual(SignStageStatus.COMPLETED);
    expect(signStage2?.stage_data).toBeDefined();
    expect(signStage2?.session_state).toEqual(TssSessionState.COMPLETED);
    expect(signStage2?.wallet_id).toEqual(walletId);
  });

  it("run sign step 1 failure - unauthorized", async () => {
    const walletId = "550e8400-e29b-41d4-a716-446655440000";

    const signStep1Request: SignStep1Request = {
      email: "test@test.com",
      wallet_id: walletId,
      session_id: "session_id",
      msg: Array.from(new Uint8Array(32)),
      msgs_1: {
        wait_0: {
          [Participant.P0]: "wait_0",
          [Participant.P1]: "wait_1",
          [Participant.P2]: "wait_2",
        },
      },
    };

    const signStep1Response = await runSignStep1(pool, signStep1Request);
    if (signStep1Response.success === true) {
      throw new Error("sign step 1 should fail");
    }

    expect(signStep1Response.success).toBe(false);
    expect(signStep1Response.code).toBe("UNAUTHORIZED");
  });

  it("run sign step 1 failure - invalid tss session: not found session", async () => {
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

    const signStep1Request: SignStep1Request = {
      email: email,
      wallet_id: wallet.wallet_id,
      session_id: sessionId,
      msg: Array.from(new Uint8Array(32)),
      msgs_1: {
        wait_0: {
          [Participant.P0]: "wait_0",
          [Participant.P1]: "wait_1",
          [Participant.P2]: "wait_2",
        },
      },
    };
    const signStep1Response = await runSignStep1(pool, signStep1Request);
    if (signStep1Response.success === true) {
      throw new Error("sign step 1 should fail");
    }

    expect(signStep1Response.success).toBe(false);
    expect(signStep1Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run sign step 1 failure - invalid tss session: not match wallet", async () => {
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
      stage_type: TssStageType.PRESIGN,
      stage_status: TriplesStageStatus.COMPLETED,
      stage_data: {
        presign_state: null,
        presign_messages: null,
        presign_output: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const signStep1Request: SignStep1Request = {
      email: email,
      wallet_id: walletId,
      session_id: session.session_id,
      msg: Array.from(new Uint8Array(32)),
      msgs_1: {
        wait_0: {
          [Participant.P0]: "wait_0",
          [Participant.P1]: "wait_1",
          [Participant.P2]: "wait_2",
        },
      },
    };
    const signStep1Response = await runSignStep1(pool, signStep1Request);
    if (signStep1Response.success === true) {
      throw new Error("sign step 1 should fail");
    }

    expect(signStep1Response.success).toBe(false);
    expect(signStep1Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run sign step 1 failure - invalid tss stage", async () => {
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
      stage_type: TssStageType.PRESIGN,
      stage_status: PresignStageStatus.STEP_2,
      stage_data: {
        presign_state: null,
        presign_messages: null,
        presign_output: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const signStep1Request: SignStep1Request = {
      email: email,
      wallet_id: walletId,
      session_id: session.session_id,
      msg: Array.from(new Uint8Array(32)),
      msgs_1: {
        wait_0: {
          [Participant.P0]: "wait_0",
          [Participant.P1]: "wait_1",
          [Participant.P2]: "wait_2",
        },
      },
    };
    const signStep1Response = await runSignStep1(pool, signStep1Request);
    if (signStep1Response.success === true) {
      throw new Error("sign step 1 should fail");
    }

    expect(signStep1Response.success).toBe(false);
    expect(signStep1Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run sign step 1 failure - invalid tss stage: already exist sign stage", async () => {
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
      stage_type: TssStageType.PRESIGN,
      stage_status: TriplesStageStatus.COMPLETED,
      stage_data: {
        presign_state: null,
        presign_messages: null,
        presign_output: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const createTssStageRes2 = await createTssStage(pool, {
      session_id: session.session_id,
      stage_type: TssStageType.SIGN,
      stage_status: SignStageStatus.STEP_1,
      stage_data: {
        sign_state: null,
        sign_messages: null,
        sign_output: null,
      },
    });
    if (createTssStageRes2.success === false) {
      console.error(createTssStageRes2.err);
      throw new Error("Failed to create tss stage");
    }

    const signStep1Request: SignStep1Request = {
      email: email,
      wallet_id: walletId,
      session_id: session.session_id,
      msg: Array.from(new Uint8Array(32)),
      msgs_1: {
        wait_0: {
          [Participant.P0]: "wait_0",
          [Participant.P1]: "wait_1",
          [Participant.P2]: "wait_2",
        },
      },
    };
    const signStep1Response = await runSignStep1(pool, signStep1Request);
    if (signStep1Response.success === true) {
      throw new Error("sign step 1 should fail");
    }

    expect(signStep1Response.success).toBe(false);
    expect(signStep1Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run sign step 2 failure - invalid tss session: not found session", async () => {
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

    const signStep2Request: SignStep2Request = {
      email: email,
      wallet_id: walletId,
      session_id: sessionId,
      sign_output: {
        sig: {
          big_r: "",
          s: "",
        },
        is_high: false,
      },
    };

    const signStep2Response = await runSignStep2(pool, signStep2Request);
    if (signStep2Response.success === true) {
      throw new Error("sign step 2 should fail");
    }

    expect(signStep2Response.success).toBe(false);
    expect(signStep2Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run sign step 2 failure - invalid tss session: not match wallet", async () => {
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
      stage_type: TssStageType.SIGN,
      stage_status: SignStageStatus.STEP_1,
      stage_data: {
        sign_state: null,
        sign_messages: null,
        sign_output: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const signStep2Request: SignStep2Request = {
      email: email,
      wallet_id: walletId,
      session_id: session.session_id,
      sign_output: {
        sig: {
          big_r: "",
          s: "",
        },
        is_high: false,
      },
    };
    const signStep2Response = await runSignStep2(pool, signStep2Request);
    if (signStep2Response.success === true) {
      throw new Error("sign step 2 should fail");
    }

    expect(signStep2Response.success).toBe(false);
    expect(signStep2Response.code).toBe("INVALID_TSS_SESSION");
  });

  it("run sign step 2 failure - invalid tss stage", async () => {
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
      stage_type: TssStageType.SIGN,
      stage_status: SignStageStatus.COMPLETED,
      stage_data: {
        sign_state: null,
        sign_messages: null,
        sign_output: null,
      },
    });
    if (createTssStageRes.success === false) {
      console.error(createTssStageRes.err);
      throw new Error("Failed to create tss stage");
    }

    const signStep2Request: SignStep2Request = {
      email: email,
      wallet_id: walletId,
      session_id: session.session_id,
      sign_output: {
        sig: {
          big_r: "",
          s: "",
        },
        is_high: false,
      },
    };
    const signStep2Response = await runSignStep2(pool, signStep2Request);
    if (signStep2Response.success === true) {
      throw new Error("sign step 2 should fail");
    }

    expect(signStep2Response.success).toBe(false);
    expect(signStep2Response.code).toBe("INVALID_TSS_STAGE");
  });

  it("run sign step 2 failure - invalid tss sign result", async () => {
    const { email, walletId, sessionId, clientPresignState } =
      await setUpTssStage(pool);

    const clientSignState: TECDSASignState = {
      signState: null,
      signMessages: null,
    };
    const msg = crypto.getRandomValues(new Uint8Array(32));

    // step 1
    const clientSignResult1 = napiRunSignClientStep1V2(
      msg,
      clientPresignState.presignOutput,
    );
    clientSignState.signState = clientSignResult1.st_0;

    const signStep1Request: SignStep1Request = {
      email: email,
      wallet_id: walletId,
      session_id: sessionId,
      msg: Array.from(msg),
      msgs_1: clientSignResult1.msgs_1,
    };
    const signStep1Response = await runSignStep1(pool, signStep1Request);
    if (signStep1Response.success === false) {
      console.error(signStep1Response);
      throw new Error("Failed to run sign step 1");
    }
    clientSignState.signMessages = signStep1Response.data?.msgs_0;

    // step 2
    napiRunSignClientStep2(
      clientSignState.signState,
      clientSignState.signMessages,
      clientPresignState.presignOutput,
    );

    const signStep2Request: SignStep2Request = {
      email: email,
      wallet_id: walletId,
      session_id: sessionId,
      sign_output: {
        sig: {
          big_r: "",
          s: "",
        },
        is_high: false,
      },
    };
    const signStep2Response = await runSignStep2(pool, signStep2Request);
    if (signStep2Response.success === true) {
      throw new Error("sign step 2 should fail");
    }

    expect(signStep2Response.success).toBe(false);
    expect(signStep2Response.code).toBe("INVALID_TSS_SIGN_RESULT");
  });
});
