import {
  reqKeygenStep1,
  reqKeygenStep2,
  reqKeygenStep3,
  reqKeygenStep4,
  reqKeygenStep5,
} from "@oko-wallet/api-lib";
import { Bytes, type Bytes32 } from "@oko-wallet/bytes";
import { wasmModule } from "@oko-wallet/cait-sith-keplr-wasm";
import type { Result } from "@oko-wallet/stdlib-js";
import type {
  CentralizedKeygenOutput,
  ClientKeygenStepOutput,
  KeygenOutput,
  KeygenStep1V2Request,
  KeygenStep2V2Request,
  KeygenStep3V2Request,
  KeygenStep4V2Request,
  KeygenStep5V2Request,
  TECDSAClientKeygenState,
} from "@oko-wallet/tecdsa-interface";
import { Participant } from "@oko-wallet/tecdsa-interface";

import type { KeygenOutputBytes, KeygenResult } from "./types";

export async function importExternalSecretKey(
  secretKey: Bytes32,
): Promise<Result<KeygenResult, string>> {
  try {
    const tssSplitSecretKeyResult: CentralizedKeygenOutput =
      await wasmModule.cli_keygen_import([...secretKey.toUint8Array()]);

    const [keygen_1, keygen_2] = tssSplitSecretKeyResult.keygen_outputs;

    const keygen1PrivateShareBytesRes = Bytes.fromHexString(
      keygen_1.private_share,
      32,
    );
    if (keygen1PrivateShareBytesRes.success === false) {
      return {
        success: false,
        err: keygen1PrivateShareBytesRes.err,
      };
    }

    const keygen1PublicKeyBytesRes = Bytes.fromHexString(
      keygen_1.public_key,
      33,
    );
    if (keygen1PublicKeyBytesRes.success === false) {
      return {
        success: false,
        err: keygen1PublicKeyBytesRes.err,
      };
    }

    const keygen2PrivateShareBytesRes = Bytes.fromHexString(
      keygen_2.private_share,
      32,
    );
    if (keygen2PrivateShareBytesRes.success === false) {
      return {
        success: false,
        err: keygen2PrivateShareBytesRes.err,
      };
    }

    const keygen_1_bytes: KeygenOutputBytes = {
      tss_private_share: keygen1PrivateShareBytesRes.data,
      public_key: keygen1PublicKeyBytesRes.data,
    };

    const keygen_2_bytes: KeygenOutputBytes = {
      tss_private_share: keygen2PrivateShareBytesRes.data,
      public_key: keygen1PublicKeyBytesRes.data, // public key is same for keygen_1 and keygen_2
    };

    return {
      success: true,
      data: { keygen_1: keygen_1_bytes, keygen_2: keygen_2_bytes },
    };
  } catch (error: any) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function runKeygen(): Promise<Result<KeygenResult, string>> {
  try {
    const keygenOutput: CentralizedKeygenOutput =
      await wasmModule.cli_keygen_centralized();
    const [keygen_1, keygen_2] = keygenOutput.keygen_outputs;

    const keygen1PrivateShareBytesRes = Bytes.fromHexString(
      keygen_1.private_share,
      32,
    );
    if (keygen1PrivateShareBytesRes.success === false) {
      return {
        success: false,
        err: keygen1PrivateShareBytesRes.err,
      };
    }

    const keygen1PublicKeyBytesRes = Bytes.fromHexString(
      keygen_1.public_key,
      33,
    );
    if (keygen1PublicKeyBytesRes.success === false) {
      return {
        success: false,
        err: keygen1PublicKeyBytesRes.err,
      };
    }

    const keygen2PrivateShareBytesRes = Bytes.fromHexString(
      keygen_2.private_share,
      32,
    );
    if (keygen2PrivateShareBytesRes.success === false) {
      return {
        success: false,
        err: keygen2PrivateShareBytesRes.err,
      };
    }

    const keygen_1_bytes: KeygenOutputBytes = {
      tss_private_share: keygen1PrivateShareBytesRes.data,
      public_key: keygen1PublicKeyBytesRes.data,
    };

    const keygen_2_bytes: KeygenOutputBytes = {
      tss_private_share: keygen2PrivateShareBytesRes.data,
      public_key: keygen1PublicKeyBytesRes.data, // public key is same for keygen_1 and keygen_2
    };

    return {
      success: true,
      data: { keygen_1: keygen_1_bytes, keygen_2: keygen_2_bytes },
    };
  } catch (error: any) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function runKeygenDecentralized(
  endpoint: string,
  userId = "user_1",
): Promise<KeygenOutput> {
  const keygenState: TECDSAClientKeygenState = {
    keygenState: null,
    keygenMessages: null,
    keygenOutput: null,
  };

  const keygenClientStep1Result: ClientKeygenStepOutput =
    await wasmModule.cli_keygen_step_1();
  console.log("\n keygen step1 cli res: %j", keygenClientStep1Result);

  keygenState.keygenState = keygenClientStep1Result.st_0;

  const keygenStep1Req: KeygenStep1V2Request = {
    user_id: userId,
    msgs_1: keygenClientStep1Result.msgs_1,
  };
  const keygenStep1Resp = await reqKeygenStep1(endpoint, keygenStep1Req);
  console.log("\n keygen step1 srv resp: %j", keygenStep1Resp);

  keygenState.keygenMessages = keygenStep1Resp.msgs_0;

  // cli keygen step 2
  const keygenClientStep2Result: ClientKeygenStepOutput =
    await wasmModule.cli_keygen_step_2(
      keygenState.keygenState,
      keygenState.keygenMessages,
    );
  console.log("\n keygen step2 cli res: %j", keygenClientStep2Result);

  keygenState.keygenState = keygenClientStep2Result.st_0;

  const keygenStep2Req: KeygenStep2V2Request = {
    user_id: userId,
    wait_1_0_1: keygenClientStep2Result.msgs_1.wait_1[Participant.P0]!,
  };
  const keygenStep2Resp = await reqKeygenStep2(endpoint, keygenStep2Req);
  console.log("\n keygen step2 srv resp: %j", keygenStep2Resp);

  const { wait_1_1_0 } = keygenStep2Resp;
  keygenState.keygenMessages.wait_1[Participant.P1] = wait_1_1_0;

  // cli keygen step 3
  const keygenClientStep3Result: ClientKeygenStepOutput =
    await wasmModule.cli_keygen_step_3(
      keygenState.keygenState,
      keygenState.keygenMessages,
    );
  console.log("\n keygen step3 cli res: %j", keygenClientStep3Result);

  keygenState.keygenState = keygenClientStep3Result.st_0;

  const keygenStep3Req: KeygenStep3V2Request = {
    user_id: userId,
    wait_2_0_1: keygenClientStep3Result.msgs_1.wait_2[Participant.P0]!,
  };
  const keygenStep3Resp = await reqKeygenStep3(endpoint, keygenStep3Req);
  console.log("\n keygen step3 srv resp: %j", keygenStep3Resp);

  const { wait_2_1_0 } = keygenStep3Resp;
  keygenState.keygenMessages.wait_2[Participant.P1] = wait_2_1_0;

  // cli keygen step 4
  const keygenClientStep4Result: ClientKeygenStepOutput =
    await wasmModule.cli_keygen_step_4(
      keygenState.keygenState,
      keygenState.keygenMessages,
    );
  console.log("\n keygen step4 cli res: %j", keygenClientStep4Result);

  keygenState.keygenState = keygenClientStep4Result.st_0;

  const keygenStep4Req: KeygenStep4V2Request = {
    user_id: userId,
    wait_3_0_1: keygenClientStep4Result.msgs_1.wait_3[Participant.P0]!,
  };
  const keygenStep4Resp = await reqKeygenStep4(endpoint, keygenStep4Req);
  console.log("\n keygen step4 srv resp: %j", keygenStep4Resp);

  const { wait_3_1_0 } = keygenStep4Resp;
  keygenState.keygenMessages.wait_3[Participant.P1] = wait_3_1_0;

  const keygenClientStep5Result: KeygenOutput =
    await wasmModule.cli_keygen_step_5(
      keygenState.keygenState,
      keygenState.keygenMessages,
    );
  console.log("\n keygen step5 cli res: %j", keygenClientStep5Result);

  keygenState.keygenOutput = keygenClientStep5Result;

  const keygenStep5Req: KeygenStep5V2Request = {
    user_id: userId,
    public_key: keygenClientStep5Result.public_key,
  };
  const keygenStep5Resp = await reqKeygenStep5(endpoint, keygenStep5Req);
  console.log("\n keygen step5 srv resp: %j", keygenStep5Resp);

  if (keygenStep5Resp.public_key !== keygenClientStep5Result.public_key) {
    throw new Error("public key is not same!");
  }

  return keygenState.keygenOutput;
}
