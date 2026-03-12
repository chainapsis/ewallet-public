import { reqSignStep1, reqSignStep2 } from "@oko-wallet/api-lib";
import {
  runSignClientStep1,
  runSignClientStep2,
} from "@oko-wallet/cait-sith-keplr-addon/src/client";
import { runVerify } from "@oko-wallet/cait-sith-keplr-addon/src/server";
import type {
  SignStep1Request,
  SignStep2Request,
  TECDSAClientState,
} from "@oko-wallet/tecdsa-interface";

export async function e2eSignTest(clientState: TECDSAClientState) {
  const msg = "TestMsg";

  // client execute step1
  const signClientStep1Result = runSignClientStep1(
    msg,
    clientState.presignOutput0!,
  );
  console.log("\n sign step1 cli res: %j", signClientStep1Result);

  clientState.signState0 = signClientStep1Result.st_0;

  const signStep1Req: SignStep1Request = {
    msg,
    msgs_2: signClientStep1Result.msgs_2,
  };
  const signStep1Resp = await reqSignStep1(signStep1Req);
  console.log("\n sign step1 resp: %j", signStep1Resp);

  const { msgs_0 } = signStep1Resp;

  clientState.signMessages0 = msgs_0;

  // client execute step2
  const fullSignature0 = runSignClientStep2(
    clientState.signState0,
    clientState.signMessages0,
    msg,
    clientState.presignOutput0!,
    clientState.keygenOutput0!,
  );

  console.log("\n sign step2 cli res: %j", fullSignature0);

  const signStep2Req: SignStep2Request = {
    msg,
    sig: fullSignature0,
  };
  const signStep2Resp = await reqSignStep2(signStep2Req);
  console.log("\n sign step2 resp: %j", signStep2Resp);

  const { sig } = signStep2Resp;

  if (fullSignature0.big_r === sig.big_r && fullSignature0.s === sig.s) {
    console.log(
      `sign success. big_r: ${fullSignature0.big_r}, s: ${fullSignature0.s}`,
    );
  } else {
    throw new Error("sign failed. big_r or s do not match");
  }

  const isVerified = runVerify(
    fullSignature0,
    clientState.keygenOutput0!.public_key,
    msg,
  );

  console.log("\n sign verified: %s", isVerified);
}
