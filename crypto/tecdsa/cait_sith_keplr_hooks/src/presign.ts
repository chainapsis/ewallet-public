import {
  reqPresignStep1,
  reqPresignStep2,
  reqPresignStep3,
} from "@oko-wallet/api-lib";
import { wasmModule } from "@oko-wallet/cait-sith-keplr-wasm";
import type {
  PresignStep1Body,
  PresignStep2Body,
  PresignStep3Body,
} from "@oko-wallet/oko-types/tss";
import type { Result } from "@oko-wallet/stdlib-js";
import type {
  ClientPresignStepOutput,
  KeygenOutput,
  PresignOutput,
  TECDSAPresignState,
  TriplePub,
  TriplesShare,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";

export type RunPresignError =
  | { type: "aborted" }
  | { type: "error"; msg: string };

export async function runPresign(
  endpoint: string,
  sessionId: string,
  triples: {
    triple0: {
      pub: TriplePub;
      share: TriplesShare;
    };
    triple1: {
      pub: TriplePub;
      share: TriplesShare;
    };
  },
  keygenOutput: KeygenOutput,
  authToken: string,
  getIsAborted: () => boolean,
): Promise<Result<PresignOutput, RunPresignError>> {
  const currentAuthToken = authToken;

  // const handleTokenRefresh = (newToken: string) => {
  //   if (currentAuthToken !== newToken) {
  //     console.log("presign: token refreshed");
  //     currentAuthToken = newToken;
  //     onAuthTokenRefresh(newToken);
  //   }
  // };

  const presignState: TECDSAPresignState = {
    presignState: null,
    presignMessages: null,
    presignOutput: null,
  };

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  const presignClientStep1Result: ClientPresignStepOutput =
    await wasmModule.cli_presign_step_1(
      triples.triple0.pub,
      triples.triple1.pub,
      triples.triple0.share,
      triples.triple1.share,
      keygenOutput,
    );

  console.log("\n presign step1 cli res: %j", presignClientStep1Result);
  presignState.presignState = presignClientStep1Result.st_0;

  const presignStep1Body: PresignStep1Body = {
    session_id: sessionId,
    msgs_1: presignClientStep1Result.msgs_1,
  };
  const presignStep1Resp = await reqPresignStep1(
    endpoint,
    presignStep1Body,
    currentAuthToken,
  );
  console.log("\n presign step1 resp: %j", presignStep1Resp);
  if (presignStep1Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: presignStep1Resp.code },
    };
  }

  presignState.presignMessages = presignStep1Resp.data.msgs_0;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  const presignClientStep2Result: ClientPresignStepOutput =
    await wasmModule.cli_presign_step_2(presignState.presignState);

  console.log("\n presign step2 cli res: %j", presignClientStep2Result);
  presignState.presignState = presignClientStep2Result.st_0;

  const presignStep2Body: PresignStep2Body = {
    session_id: sessionId,
    wait_1_0_1: presignClientStep2Result.msgs_1.wait_1[Participant.P0]!,
  };
  const presignStep2Resp = await reqPresignStep2(
    endpoint,
    presignStep2Body,
    currentAuthToken,
  );
  console.log("\n presign step2 resp: %j", presignStep2Resp);
  if (presignStep2Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: presignStep2Resp.code },
    };
  }

  const { wait_1_1_0 } = presignStep2Resp.data;
  presignState.presignMessages.wait_1[Participant.P1] = wait_1_1_0;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // client execute step3
  const presignOutput0: PresignOutput = await wasmModule.cli_presign_step_3(
    presignState.presignState,
    presignState.presignMessages,
  );

  console.log("\n presign step3 cli res: %j", presignOutput0);
  presignState.presignOutput = presignOutput0;

  const presignStep3Body: PresignStep3Body = {
    session_id: sessionId,
    presign_big_r: presignOutput0.big_r,
  };
  const presignStep3Resp = await reqPresignStep3(
    endpoint,
    presignStep3Body,
    currentAuthToken,
  );
  console.log("\n presign step3 resp: %j", presignStep3Resp);
  if (presignStep3Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: presignStep3Resp.code },
    };
  }

  const { presign_big_r } = presignStep3Resp.data;

  if (presignOutput0.big_r !== presign_big_r) {
    throw new Error("presign failed. big_r do not match");
  }

  return {
    success: true,
    data: presignOutput0,
  };
}
