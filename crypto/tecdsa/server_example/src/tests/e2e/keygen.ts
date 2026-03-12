import {
  reqKeygenStep1,
  reqKeygenStep2,
  reqKeygenStep3,
  reqKeygenStep4,
  reqKeygenStep5,
} from "@oko-wallet/api-lib";
import {
  runKeygenClientStep1,
  runKeygenClientStep2,
  runKeygenClientStep3,
  runKeygenClientStep4,
  runKeygenClientStep5,
} from "@oko-wallet/cait-sith-keplr-addon/src/client";
import {
  type KeygenStep1V2Request,
  type KeygenStep2V2Request,
  type KeygenStep3V2Request,
  type KeygenStep4V2Request,
  type KeygenStep5V2Request,
  Participant,
  type TECDSAClientState,
} from "@oko-wallet/tecdsa-interface";

export async function e2eKeygenTest(clientState: TECDSAClientState) {
  // cli keygen step 1
  const keygenClientStep1Result = runKeygenClientStep1();
  console.log("\n keygen step1 cli res: %j", keygenClientStep1Result);

  clientState.keygenState0 = keygenClientStep1Result.st_0;
  clientState.keygenState1 = keygenClientStep1Result.st_1;
  clientState.keygenMessages0 = keygenClientStep1Result.msgs_0;
  clientState.keygenMessages1 = keygenClientStep1Result.msgs_1;

  // srv step 1
  const keygenStep1Req: KeygenStep1V2Request = {
    user_id: "user_1",
    msgs_2: keygenClientStep1Result.msgs_2,
  };
  const keygenStep1Resp = await reqKeygenStep1(keygenStep1Req);
  console.log("\n keygen step1 srv resp: %j", keygenStep1Resp);

  const { wait_0_2_0, wait_0_2_1 } = keygenStep1Resp;

  // wait_0_2_0, wait_0_2_1 추가
  clientState.keygenMessages0.wait_0![Participant.P2] = wait_0_2_0;
  clientState.keygenMessages1.wait_0![Participant.P2] = wait_0_2_1;

  // cli keygen step 2
  const keygenClientStep2Result = runKeygenClientStep2(
    clientState.keygenState0,
    clientState.keygenState1,
    clientState.keygenMessages0,
    clientState.keygenMessages1,
  );
  console.log("\n keygen step2 cli res: %j", keygenClientStep2Result);

  clientState.keygenState0 = keygenClientStep2Result.st_0;
  clientState.keygenState1 = keygenClientStep2Result.st_1;
  clientState.keygenMessages0.wait_1[Participant.P1] =
    keygenClientStep2Result.msgs_0.wait_1[Participant.P1];
  clientState.keygenMessages1.wait_1[Participant.P0] =
    keygenClientStep2Result.msgs_1.wait_1[Participant.P0];

  // srv step 2
  const keygenStep2Req: KeygenStep2V2Request = {
    user_id: "user_1",
    wait_1_0_2: keygenClientStep2Result.msgs_2.wait_1[Participant.P0]!,
    wait_1_1_2: keygenClientStep2Result.msgs_2.wait_1[Participant.P1]!,
  };
  const keygenStep2Resp = await reqKeygenStep2(keygenStep2Req);
  console.log("\n keygen step2 srv resp: %j", keygenStep2Resp);

  const { wait_1_2_0, wait_1_2_1 } = keygenStep2Resp;
  clientState.keygenMessages0.wait_1[Participant.P2] = wait_1_2_0;
  clientState.keygenMessages1.wait_1[Participant.P2] = wait_1_2_1;

  // cli keygen step 3
  const keygenClientStep3Result = runKeygenClientStep3(
    clientState.keygenState0,
    clientState.keygenState1,
    clientState.keygenMessages0,
    clientState.keygenMessages1,
  );
  console.log("\n keygen step3 cli res: %j", keygenClientStep3Result);
  clientState.keygenState0 = keygenClientStep3Result.st_0;
  clientState.keygenState1 = keygenClientStep3Result.st_1;
  clientState.keygenMessages0.wait_2[Participant.P1] =
    keygenClientStep3Result.msgs_0.wait_2[Participant.P1];
  clientState.keygenMessages1.wait_2[Participant.P0] =
    keygenClientStep3Result.msgs_1.wait_2[Participant.P0];

  const keygenStep3Req: KeygenStep3V2Request = {
    user_id: "user_1",
    wait_2_0_2: keygenClientStep3Result.msgs_2.wait_2[Participant.P0]!,
    wait_2_1_2: keygenClientStep3Result.msgs_2.wait_2[Participant.P1]!,
  };
  const keygenStep3Resp = await reqKeygenStep3(keygenStep3Req);
  console.log("\n keygen step3 srv resp: %j", keygenStep3Resp);

  const { wait_2_2_0, wait_2_2_1 } = keygenStep3Resp;
  clientState.keygenMessages0.wait_2[Participant.P2] = wait_2_2_0;
  clientState.keygenMessages1.wait_2[Participant.P2] = wait_2_2_1;

  // cli keygen step 4
  const keygenClientStep4Result = runKeygenClientStep4(
    clientState.keygenState0,
    clientState.keygenState1,
    clientState.keygenMessages0,
    clientState.keygenMessages1,
  );
  console.log("\n keygen step4 cli res: %j", keygenClientStep4Result);

  clientState.keygenState0 = keygenClientStep4Result.st_0;
  clientState.keygenState1 = keygenClientStep4Result.st_1;
  clientState.keygenMessages0.wait_3[Participant.P1] =
    keygenClientStep4Result.msgs_0.wait_3[Participant.P1];
  clientState.keygenMessages1.wait_3[Participant.P0] =
    keygenClientStep4Result.msgs_1.wait_3[Participant.P0];

  // srv keygen step 4
  const keygenStep4Req: KeygenStep4V2Request = {
    user_id: "user_1",
    wait_3_0_2: keygenClientStep4Result.msgs_2.wait_3[Participant.P0]!,
    wait_3_1_2: keygenClientStep4Result.msgs_2.wait_3[Participant.P1]!,
  };
  const keygenStep4Resp = await reqKeygenStep4(keygenStep4Req);
  console.log("\n keygen step4 srv resp: %j", keygenStep4Resp);

  const { wait_3_2_0, wait_3_2_1 } = keygenStep4Resp;
  clientState.keygenMessages0.wait_3[Participant.P2] = wait_3_2_0;
  clientState.keygenMessages1.wait_3[Participant.P2] = wait_3_2_1;

  const { keygen_0, keygen_1 } = runKeygenClientStep5(
    clientState.keygenState0,
    clientState.keygenState1,
    clientState.keygenMessages0,
    clientState.keygenMessages1,
  );
  clientState.keygenOutput0 = keygen_0;
  clientState.keygenOutput1 = keygen_1;

  const keygenStep5Req: KeygenStep5V2Request = {
    user_id: "user_1",
    public_key: keygen_0.public_key,
  };
  const keygenStep5Resp = await reqKeygenStep5(keygenStep5Req);
  console.log("\n keygen step5 srv resp: %j", keygenStep5Resp);

  if (keygenStep5Resp.public_key !== keygen_0.public_key) {
    throw new Error("public key is not same!");
  }
}
