import { reqSignStep1, reqSignStep2 } from "@oko-wallet/api-lib";
import { wasmModule } from "@oko-wallet/cait-sith-keplr-wasm";
import type { SignStep1Body, SignStep2Body } from "@oko-wallet/oko-types/tss";
import type { Result } from "@oko-wallet/stdlib-js";
import type {
  ClientSignStep1Output,
  PresignOutput,
  SignOutput,
  TECDSASignState,
} from "@oko-wallet/tecdsa-interface";

export type RunSignError = { type: "aborted" } | { type: "error"; msg: string };

export async function runSign(
  endpoint: string,
  sessionId: string,
  signMessage: Uint8Array,
  presignOutput: PresignOutput,
  authToken: string,
  getIsAborted: () => boolean,
): Promise<Result<SignOutput, RunSignError>> {
  const currentAuthToken = authToken;

  const signState: TECDSASignState = {
    signState: null,
    signMessages: null,
  };
  const msg = signMessage;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // client execute step1
  const signClientStep1Result: ClientSignStep1Output =
    await wasmModule.cli_sign_step_1_2(msg, presignOutput);

  console.log("\n sign step1 cli res: %j", signClientStep1Result);
  signState.signState = signClientStep1Result.st_0;

  const signStep1Body: SignStep1Body = {
    session_id: sessionId,
    msg: Array.from(msg),
    msgs_1: signClientStep1Result.msgs_1,
  };
  const signStep1Resp = await reqSignStep1(
    endpoint,
    signStep1Body,
    currentAuthToken,
  );
  console.log("\n sign step1 resp: %j", signStep1Resp);
  if (signStep1Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: signStep1Resp.code },
    };
  }

  const { msgs_0 } = signStep1Resp.data;
  signState.signMessages = msgs_0;

  if (getIsAborted()) {
    return { success: false, err: { type: "aborted" } };
  }

  // client execute step2
  const signOutput0: SignOutput = wasmModule.cli_sign_step_2(
    signState.signState,
    signState.signMessages,
    presignOutput,
  );
  console.log("\n sign step2 cli res: %j", signOutput0);

  const signStep2Body: SignStep2Body = {
    session_id: sessionId,
    sign_output: signOutput0,
  };
  const signStep2Resp = await reqSignStep2(
    endpoint,
    signStep2Body,
    currentAuthToken,
  );
  console.log("\n sign step2 resp: %j", signStep2Resp);
  if (signStep2Resp.success === false) {
    return {
      success: false,
      err: { type: "error", msg: signStep2Resp.code },
    };
  }

  return {
    success: true,
    data: signStep2Resp.data.sign_output,
  };
}
