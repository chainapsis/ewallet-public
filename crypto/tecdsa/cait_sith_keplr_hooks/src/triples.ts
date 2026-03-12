import {
  reqTriplesStep1,
  reqTriplesStep2,
  reqTriplesStep3,
  reqTriplesStep4,
  reqTriplesStep5,
  reqTriplesStep6,
  reqTriplesStep7,
  reqTriplesStep8,
  reqTriplesStep9,
  reqTriplesStep10,
  reqTriplesStep11,
} from "@oko-wallet/api-lib";
import { wasmModule } from "@oko-wallet/cait-sith-keplr-wasm";
import type {
  TriplesStep1Body,
  TriplesStep2Body,
  TriplesStep3Body,
  TriplesStep4Body,
  TriplesStep5Body,
  TriplesStep6Body,
  TriplesStep7Body,
  TriplesStep8Body,
  TriplesStep9Body,
  TriplesStep10Body,
  TriplesStep11Body,
} from "@oko-wallet/oko-types/tss";
import type { Result } from "@oko-wallet/stdlib-js";
import type {
  ClientTriplesStepOutput,
  TECDSATriplesState,
  TriplesGenManyResult,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";

import type { TriplesResult } from "./types";

export type RunTriplesError =
  | { type: "aborted" }
  | { type: "error"; msg: string };

export async function runTriples(
  endpoint: string,
  apiKey: string,
  authToken: string,
  getIsAborted: () => boolean,
  // onAuthTokenRefresh: (newToken: string) => void,
): Promise<Result<TriplesResult, RunTriplesError>> {
  const currentAuthToken = authToken;

  // // wrap the onAuthTokenRefresh function to handle change of authToken
  // const handleTokenRefresh = (newToken: string) => {
  //   if (currentAuthToken !== newToken) {
  //     console.log("triples: token refreshed");
  //     currentAuthToken = newToken;
  //     onAuthTokenRefresh(newToken);
  //   }
  // };

  const triplesState: TECDSATriplesState = {
    triplesState: null,
    triplesMessages: null,
    triple0Pub: null,
    triple1Pub: null,
    triple0Share: null,
    triple1Share: null,
  };

  // step1
  const triplesClientStep1Result: ClientTriplesStepOutput =
    await wasmModule.cli_triples_2_step_1();
  console.log("\n triples step1 cli res: %j", triplesClientStep1Result);
  triplesState.triplesState = triplesClientStep1Result.st_0;

  const triplesStep1Body: TriplesStep1Body = {
    msgs_1: triplesClientStep1Result.msgs_1,
  };
  const triplesStep1Resp = await reqTriplesStep1(
    endpoint,
    triplesStep1Body,
    apiKey,
    currentAuthToken,
    // handleTokenRefresh,
  );
  console.log("\n triples step1 resp: %j", triplesStep1Resp);
  if (triplesStep1Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: triplesStep1Resp.code },
    };
  }
  const { session_id, msgs_0 } = triplesStep1Resp.data;
  triplesState.triplesMessages = msgs_0;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // step2
  const triplesClientStep2Result: ClientTriplesStepOutput =
    await wasmModule.cli_triples_2_step_2(
      triplesState.triplesState,
      triplesState.triplesMessages,
    );
  console.log("\n triples step2 cli res: %j", triplesClientStep2Result);
  triplesState.triplesState = triplesClientStep2Result.st_0;

  const triplesStep2Body: TriplesStep2Body = {
    session_id,
    wait_1: triplesClientStep2Result.msgs_1.wait_1[Participant.P0]!,
  };
  const triplesStep2Resp = await reqTriplesStep2(
    endpoint,
    triplesStep2Body,
    currentAuthToken,
  );
  console.log("\n triples step2 resp: %j", triplesStep2Resp);
  if (triplesStep2Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: triplesStep2Resp.code },
    };
  }
  const { wait_1 } = triplesStep2Resp.data;
  triplesState.triplesMessages!.wait_1[Participant.P1] = wait_1;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // step3
  const triplesClientStep3Result: ClientTriplesStepOutput =
    await wasmModule.cli_triples_2_step_3(
      triplesState.triplesState,
      triplesState.triplesMessages,
    );
  console.log("\n triples step3 cli res: %j", triplesClientStep3Result);
  triplesState.triplesState = triplesClientStep3Result.st_0;

  const triplesStep3Body: TriplesStep3Body = {
    session_id,
    wait_2: triplesClientStep3Result.msgs_1.wait_2[Participant.P0]!,
  };
  const triplesStep3Resp = await reqTriplesStep3(
    endpoint,
    triplesStep3Body,
    currentAuthToken,
  );
  console.log("\n triples step3 resp: %j", triplesStep3Resp);
  if (triplesStep3Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: triplesStep3Resp.code },
    };
  }
  const { wait_2 } = triplesStep3Resp.data;
  triplesState.triplesMessages!.wait_2[Participant.P1] = wait_2;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // step4
  const triplesClientStep4Result: ClientTriplesStepOutput =
    await wasmModule.cli_triples_2_step_4(
      triplesState.triplesState,
      triplesState.triplesMessages,
    );
  console.log("\n triples step4 cli res: %j", triplesClientStep4Result);
  triplesState.triplesState = triplesClientStep4Result.st_0;

  const triplesStep4Body: TriplesStep4Body = {
    session_id,
    wait_3: triplesClientStep4Result.msgs_1.wait_3[Participant.P0]!,
  };
  const triplesStep4Resp = await reqTriplesStep4(
    endpoint,
    triplesStep4Body,
    currentAuthToken,
  );
  console.log("\n triples step4 resp: %j", triplesStep4Resp);
  if (triplesStep4Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: triplesStep4Resp.code },
    };
  }
  const { wait_3 } = triplesStep4Resp.data;
  triplesState.triplesMessages!.wait_3[Participant.P1] = wait_3;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // step5
  const triplesClientStep5Result: ClientTriplesStepOutput =
    await wasmModule.cli_triples_2_step_5(
      triplesState.triplesState,
      triplesState.triplesMessages,
    );
  console.log("\n triples step5 cli res: %j", triplesClientStep5Result);
  triplesState.triplesState = triplesClientStep5Result.st_0;

  const triplesStep5Body: TriplesStep5Body = {
    session_id,
    wait_4: triplesClientStep5Result.msgs_1.wait_4[Participant.P0]!,
  };
  const triplesStep5Resp = await reqTriplesStep5(
    endpoint,
    triplesStep5Body,
    currentAuthToken,
  );
  console.log("\n triples step5 resp: %j", triplesStep5Resp);
  if (triplesStep5Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: triplesStep5Resp.code },
    };
  }
  const { wait_4 } = triplesStep5Resp.data;
  triplesState.triplesMessages!.wait_4[Participant.P1] = wait_4;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // step6
  const triplesClientStep6Result: ClientTriplesStepOutput =
    await wasmModule.cli_triples_2_step_6(
      triplesState.triplesState,
      triplesState.triplesMessages,
    );
  console.log("\n triples step6 cli res: %j", triplesClientStep6Result);
  triplesState.triplesState = triplesClientStep6Result.st_0;

  const triplesStep6Body: TriplesStep6Body = {
    session_id,
    batch_random_ot_wait_0:
      triplesClientStep6Result.msgs_1.batch_random_ot_wait_0[Participant.P0]!,
  };
  const triplesStep6Resp = await reqTriplesStep6(
    endpoint,
    triplesStep6Body,
    currentAuthToken,
  );
  console.log("\n triples step6 resp: %j", triplesStep6Resp);
  if (triplesStep6Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: triplesStep6Resp.code },
    };
  }
  const { batch_random_ot_wait_0 } = triplesStep6Resp.data;
  triplesState.triplesMessages!.batch_random_ot_wait_0[Participant.P1] =
    batch_random_ot_wait_0;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // step7
  const triplesClientStep7Result: ClientTriplesStepOutput =
    await wasmModule.cli_triples_2_step_7(
      triplesState.triplesState,
      triplesState.triplesMessages,
    );
  console.log("\n triples step7 cli res: %j", triplesClientStep7Result);
  triplesState.triplesState = triplesClientStep7Result.st_0;

  const triplesStep7Body: TriplesStep7Body = {
    session_id,
    correlated_ot_wait_0:
      triplesClientStep7Result.msgs_1.correlated_ot_wait_0[Participant.P0]!,
  };
  const triplesStep7Resp = await reqTriplesStep7(
    endpoint,
    triplesStep7Body,
    currentAuthToken,
  );
  console.log("\n triples step7 resp: %j", triplesStep7Resp);
  if (triplesStep7Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: triplesStep7Resp.code },
    };
  }
  const { random_ot_extension_wait_0 } = triplesStep7Resp.data;
  triplesState.triplesMessages!.random_ot_extension_wait_0[Participant.P1] =
    random_ot_extension_wait_0;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // step8
  const triplesClientStep8Result: ClientTriplesStepOutput =
    await wasmModule.cli_triples_2_step_8(
      triplesState.triplesState,
      triplesState.triplesMessages,
    );
  console.log("\n triples step8 cli res: %j", triplesClientStep8Result);
  triplesState.triplesState = triplesClientStep8Result.st_0;

  const triplesStep8Body: TriplesStep8Body = {
    session_id,
    random_ot_extension_wait_1:
      triplesClientStep8Result.msgs_1.random_ot_extension_wait_1[
        Participant.P0
      ]!,
  };
  const triplesStep8Resp = await reqTriplesStep8(
    endpoint,
    triplesStep8Body,
    currentAuthToken,
  );
  console.log("\n triples step8 resp: %j", triplesStep8Resp);
  if (triplesStep8Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: triplesStep8Resp.code },
    };
  }
  const { mta_wait_0 } = triplesStep8Resp.data;
  triplesState.triplesMessages!.mta_wait_0[Participant.P1] = mta_wait_0;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // step9
  const triplesClientStep9Result: ClientTriplesStepOutput =
    await wasmModule.cli_triples_2_step_9(
      triplesState.triplesState,
      triplesState.triplesMessages,
    );
  console.log("\n triples step9 cli res: %j", triplesClientStep9Result);
  triplesState.triplesState = triplesClientStep9Result.st_0;

  const triplesStep9Body: TriplesStep9Body = {
    session_id,
    mta_wait_1: triplesClientStep9Result.msgs_1.mta_wait_1[Participant.P0]!,
  };
  const triplesStep9Resp = await reqTriplesStep9(
    endpoint,
    triplesStep9Body,
    currentAuthToken,
  );
  console.log("\n triples step9 resp: %j", triplesStep9Resp);
  if (triplesStep9Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: triplesStep9Resp.code },
    };
  }
  const { is_success } = triplesStep9Resp.data;
  if (!is_success) {
    throw new Error("req triples step9 failed");
  }

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // step10
  const triplesClientStep10Result: ClientTriplesStepOutput =
    await wasmModule.cli_triples_2_step_10(
      triplesState.triplesState,
      triplesState.triplesMessages,
    );
  console.log("\n triples step10 cli res: %j", triplesClientStep10Result);
  triplesState.triplesState = triplesClientStep10Result.st_0;

  const triplesStep10Body: TriplesStep10Body = {
    session_id,
    wait_5: triplesClientStep10Result.msgs_1.wait_5[Participant.P0]!,
    wait_6: triplesClientStep10Result.msgs_1.wait_6[Participant.P0]!,
  };
  const triplesStep10Resp = await reqTriplesStep10(
    endpoint,
    triplesStep10Body,
    currentAuthToken,
  );
  console.log("\n triples step10 resp: %j", triplesStep10Resp);
  if (triplesStep10Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: triplesStep10Resp.code },
    };
  }
  const { wait_5, wait_6 } = triplesStep10Resp.data;
  triplesState.triplesMessages!.wait_5[Participant.P1] = wait_5;
  triplesState.triplesMessages!.wait_6[Participant.P1] = wait_6;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // step11
  const triplesClientStep11Result: TriplesGenManyResult =
    await wasmModule.cli_triples_2_step_11(
      triplesState.triplesState,
      triplesState.triplesMessages,
    );
  console.log("\n triples step11 cli res: %j", triplesClientStep11Result);
  const { pub_v, share_v } = triplesClientStep11Result;
  triplesState.triple0Pub = pub_v[0];
  triplesState.triple1Pub = pub_v[1];
  triplesState.triple0Share = share_v[0];
  triplesState.triple1Share = share_v[1];

  const triplesStep11Body: TriplesStep11Body = {
    session_id,
    pub_v: pub_v,
  };
  const triplesStep11Resp = await reqTriplesStep11(
    endpoint,
    triplesStep11Body,
    currentAuthToken,
  );
  console.log("\n triples step11 resp: %j", triplesStep11Resp);
  if (triplesStep11Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: triplesStep11Resp.code },
    };
  }

  return {
    success: true,
    data: {
      sessionId: session_id,
      triple0: {
        pub: triplesState.triple0Pub,
        share: triplesState.triple0Share,
      },
      triple1: {
        pub: triplesState.triple1Pub,
        share: triplesState.triple1Share,
      },
    },
  };
}
