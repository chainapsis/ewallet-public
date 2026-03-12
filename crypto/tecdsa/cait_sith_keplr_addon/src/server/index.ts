import type {
  KeygenOutput,
  KeyshareState,
  PresignOutput,
  PresignState,
  RcvdKeyshareMessages,
  RcvdPresignMessages,
  RcvdSignMessages,
  ServerKeygenStepOutput,
  ServerSignStepOutput,
  SignOutput,
  SignState,
  TriplePub,
  TriplesGenResult,
  TriplesShare,
} from "@oko-wallet/tecdsa-interface";

import {
  napiRunKeygenServerStep1,
  napiRunKeygenServerStep2,
  napiRunKeygenServerStep3,
  napiRunKeygenServerStep4,
  napiRunKeygenServerStep5,
  napiRunPresignServerStep1,
  napiRunPresignServerStep2,
  napiRunPresignServerStep3,
  napiRunSignServerStep1,
  napiRunSignServerStep1V2,
  napiRunSignServerStep2,
  napiRunTriplesServerStep1,
  napiRunVerify,
  napiRunVerify2,
} from "../../addon/index.js";

export function runKeygenServerStep1(): ServerKeygenStepOutput {
  try {
    return napiRunKeygenServerStep1();
  } catch (err: any) {
    console.error("Error calling runKeygenServerStep1:", err.message);
    throw err;
  }
}

export function runKeygenServerStep2(
  st_1: KeyshareState,
  msgs_0: RcvdKeyshareMessages,
): ServerKeygenStepOutput {
  try {
    return napiRunKeygenServerStep2(st_1, msgs_0);
  } catch (err: any) {
    console.error("Error calling runKeygenServerStep2:", err.message);
    throw err;
  }
}

export function runKeygenServerStep3(
  st_1: KeyshareState,
  msgs_0: RcvdKeyshareMessages,
): ServerKeygenStepOutput {
  try {
    return napiRunKeygenServerStep3(st_1, msgs_0);
  } catch (err: any) {
    console.error("Error calling runKeygenServerStep3:", err.message);
    throw err;
  }
}

export function runKeygenServerStep4(
  st_1: KeyshareState,
  msgs_0: RcvdKeyshareMessages,
): ServerKeygenStepOutput {
  try {
    return napiRunKeygenServerStep4(st_1, msgs_0);
  } catch (err: any) {
    console.error("Error calling runKeygenServerStep4:", err.message);
    throw err;
  }
}

export function runKeygenServerStep5(
  st_1: KeyshareState,
  msgs_0: RcvdKeyshareMessages,
): KeygenOutput {
  try {
    return napiRunKeygenServerStep5(st_1, msgs_0);
  } catch (err: any) {
    console.error("Error calling runKeygenServerStep5:", err.message);
    throw err;
  }
}

export function runTriplesServerStep1(): TriplesGenResult {
  try {
    return napiRunTriplesServerStep1();
  } catch (err: any) {
    console.error("Error calling runTriplesServerStep1:", err.message);
    throw err;
  }
}

export function runPresignServerStep1(
  triple0Pub: TriplePub,
  triple1Pub: TriplePub,
  triple0Share1: TriplesShare,
  triple1Share1: TriplesShare,
  keygenOutput1: KeygenOutput,
): { state: PresignState; msgs0: RcvdPresignMessages } {
  try {
    const result = napiRunPresignServerStep1(
      triple0Pub,
      triple1Pub,
      triple0Share1,
      triple1Share1,
      keygenOutput1,
    );
    return {
      state: result[0],
      msgs0: result[1],
    };
  } catch (err: any) {
    console.error("Error calling runPresignServerStep1:", err.message);
    throw err;
  }
}

export function runPresignServerStep2(st1: PresignState): {
  state: PresignState;
  msgs0: RcvdPresignMessages;
} {
  try {
    const result = napiRunPresignServerStep2(st1);
    return {
      state: result[0],
      msgs0: result[1],
    };
  } catch (err: any) {
    console.error("Error calling runPresignServerStep2:", err.message);
    throw err;
  }
}

export function runPresignServerStep3(
  st1: PresignState,
  msgs1: RcvdPresignMessages,
): PresignOutput {
  try {
    return napiRunPresignServerStep3(st1, msgs1);
  } catch (err: any) {
    console.error("Error calling runPresignServerStep3:", err.message);
    throw err;
  }
}

export function runSignServerStep1(
  msg: string,
  presignOutput1: PresignOutput,
): ServerSignStepOutput {
  try {
    const result = napiRunSignServerStep1(msg, presignOutput1);
    return result;
  } catch (err: any) {
    console.error("Error calling runSignServerStep1:", err.message);
    throw err;
  }
}

export function runSignServerStep1V2(
  msg: Uint8Array,
  presignOutput1: PresignOutput,
): ServerSignStepOutput {
  try {
    const result = napiRunSignServerStep1V2(msg, presignOutput1);
    return result;
  } catch (err: any) {
    console.error("Error calling runSignServerStep1:", err.message);
    throw err;
  }
}

export function runSignServerStep2(
  st1: SignState,
  msgs1: RcvdSignMessages,
  presignOutput1: PresignOutput,
): SignOutput {
  try {
    return napiRunSignServerStep2(st1, msgs1, presignOutput1);
  } catch (err: any) {
    console.error("Error calling runSignServerStep2:", err.message);
    throw err;
  }
}

export function runVerify(
  sig: SignOutput,
  publicKey: string,
  msg: string,
): boolean {
  try {
    return napiRunVerify(sig, publicKey, msg);
  } catch (err: any) {
    console.error("Error calling runVerify:", err.message);
    throw err;
  }
}

export function runVerify2(
  sig: SignOutput,
  publicKey: string,
  msg: Uint8Array,
): boolean {
  try {
    return napiRunVerify2(sig, publicKey, msg);
  } catch (err: any) {
    console.error("Error calling runVerify:", err.message);
    throw err;
  }
}
