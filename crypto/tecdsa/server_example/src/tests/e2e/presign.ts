import {
  reqPresignStep1,
  reqPresignStep2,
  reqPresignStep3,
  reqTriplesStep1,
} from "@keplr-wallet/api-lib";
import {
  runPresignClientStep1,
  runPresignClientStep2,
  runPresignClientStep3,
} from "@oko-wallet/cait-sith-keplr-addon/src/client";
import type {
  PresignStep1V2Request,
  PresignStep2V2Request,
  PresignStep3V2Request,
  TECDSAClientState,
} from "@oko-wallet/tecdsa-interface";

export async function e2ePresignTest(clientState: TECDSAClientState) {
  const triplesStep1Resp = await reqTriplesStep1({
    user_id: "user_1",
    session_id: "session_1",
  });
  console.log("\n triples step1 resp: %j", triplesStep1Resp);

  const { pub0, pub1, shares0, shares1 } = triplesStep1Resp;

  clientState.triple0Pub = pub0;
  clientState.triple1Pub = pub1;
  clientState.triple0Share0 = shares0;
  clientState.triple1Share1 = shares1;

  const presignClientStep1Result = runPresignClientStep1(
    clientState.triple0Pub,
    clientState.triple1Pub,
    clientState.triple0Share0,
    clientState.triple1Share1,
    clientState.keygenOutput0!,
  );
  console.log("\n presign step1 cli res: %j", presignClientStep1Result);
  clientState.presignState0 = presignClientStep1Result.st_0;

  const presignStep1Req: PresignStep1V2Request = {
    user_id: "user_1",
    session_id: "session_1",
    msgs_2: presignClientStep1Result.msgs_2,
  };
  const presignStep1Resp = await reqPresignStep1(presignStep1Req);
  console.log("\n presign step1 resp: %j", presignStep1Resp);

  clientState.presignMessages0 = presignStep1Resp.msgs_0;

  const presignClientStep2Result = runPresignClientStep2(
    clientState.presignState0,
  );
  console.log("\n presign step2 cli res: %j", presignClientStep2Result);
  clientState.presignState0 = presignClientStep2Result.st_0;

  const presignStep2Req: PresignStep2V2Request = {
    user_id: "user_1",
    session_id: "session_1",
    wait_1_0_2: presignClientStep2Result.msgs_2.wait_1[0]!,
  };
  const presignStep2Resp = await reqPresignStep2(presignStep2Req);
  console.log("\n presign step2 resp: %j", presignStep2Resp);

  const { wait_1_2_0 } = presignStep2Resp;

  clientState.presignMessages0.wait_1[2] = wait_1_2_0;

  // client execute step3
  const presignOutput0 = runPresignClientStep3(
    clientState.presignState0,
    clientState.presignMessages0,
  );
  console.log("\n presign step3 cli res: %j", presignOutput0);
  clientState.presignOutput0 = presignOutput0;

  const presignStep3Req: PresignStep3V2Request = {
    user_id: "user_1",
    session_id: "session_1",
    presign_output: presignOutput0,
  };
  const presignStep3Resp = await reqPresignStep3(presignStep3Req);
  console.log("\n presign step3 resp: %j", presignStep3Resp);

  const { presign_output } = presignStep3Resp;

  if (presignOutput0.big_r !== presign_output.big_r) {
    throw new Error("presign failed. big_r do not match");
  }
}
