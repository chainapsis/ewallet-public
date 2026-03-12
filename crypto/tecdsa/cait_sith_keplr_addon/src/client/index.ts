import type {
  CentralizedKeygenOutput,
  ClientKeygenStepOutput,
  ClientPresignStepOutput,
  ClientSignStep1Output,
  KeyCombineInput,
  KeygenOutput,
  KeyshareState,
  PresignOutput,
  PresignState,
  RcvdKeyshareMessages,
  RcvdPresignMessages,
  RcvdSignMessages,
  SignOutput,
  SignState,
  TriplePub,
  TriplesShare,
} from "@oko-wallet/tecdsa-interface";

import {
  napiRunKeygenClientCentralized,
  napiRunKeygenClientStep1,
  napiRunKeygenClientStep2,
  napiRunKeygenClientStep3,
  napiRunKeygenClientStep4,
  napiRunKeygenClientStep5,
  napiRunKeygenCombineShares,
  napiRunPresignClientStep1,
  napiRunPresignClientStep2,
  napiRunPresignClientStep3,
  napiRunSignClientStep1,
  napiRunSignClientStep1V2,
  napiRunSignClientStep2,
} from "../../addon/index.js";

export * from "./triples";

export function runKeygenClientStep1(): ClientKeygenStepOutput {
  try {
    return napiRunKeygenClientStep1();
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep1:", err.message);
    throw err;
  }
}

export function runKeygenClientStep2(
  st0: KeyshareState,
  msgs0: RcvdKeyshareMessages,
): ClientKeygenStepOutput {
  try {
    return napiRunKeygenClientStep2(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep2:", err.message);
    throw err;
  }
}

export function runKeygenClientStep3(
  st0: KeyshareState,
  msgs0: RcvdKeyshareMessages,
): ClientKeygenStepOutput {
  try {
    return napiRunKeygenClientStep3(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep2:", err.message);
    throw err;
  }
}

export function runKeygenClientStep4(
  st0: KeyshareState,
  msgs0: RcvdKeyshareMessages,
): ClientKeygenStepOutput {
  try {
    return napiRunKeygenClientStep4(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep2:", err.message);
    throw err;
  }
}

export function runKeygenClientStep5(
  st0: KeyshareState,
  msgs0: RcvdKeyshareMessages,
): KeygenOutput {
  try {
    const result = napiRunKeygenClientStep5(st0, msgs0);
    return result;
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep2:", err.message);
    throw err;
  }
}

export function runKeygenClientCentralized(): CentralizedKeygenOutput {
  try {
    const result = napiRunKeygenClientCentralized();
    return result;
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep2:", err.message);
    throw err;
  }
}

export function runPresignClientStep1(
  triple0Pub: TriplePub,
  triple1Pub: TriplePub,
  triple0Share0: TriplesShare,
  triple1Share0: TriplesShare,
  keygenOutput0: KeygenOutput,
): ClientPresignStepOutput {
  try {
    const result = napiRunPresignClientStep1(
      triple0Pub,
      triple1Pub,
      triple0Share0,
      triple1Share0,
      keygenOutput0,
    );
    return result;
  } catch (err: any) {
    console.error("Error calling runPresignClientStep1:", err.message);
    throw err;
  }
}

export function runPresignClientStep2(
  st0: PresignState,
): ClientPresignStepOutput {
  try {
    const result = napiRunPresignClientStep2(st0);
    return result;
  } catch (err: any) {
    console.error("Error calling runPresignClientStep2:", err.message);
    throw err;
  }
}

export function runPresignClientStep3(
  st0: PresignState,
  msgs0: RcvdPresignMessages,
): PresignOutput {
  try {
    return napiRunPresignClientStep3(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runPresignClientStep3:", err.message);
    throw err;
  }
}

export function runSignClientStep1(
  msg: string,
  presignOutput0: PresignOutput,
): ClientSignStep1Output {
  try {
    const result = napiRunSignClientStep1(msg, presignOutput0);
    return result;
  } catch (err: any) {
    console.error("Error calling runSignClientStep1:", err.message);
    throw err;
  }
}

export function runSignClientStep1V2(
  msg: Uint8Array,
  presignOutput0: PresignOutput,
): ClientSignStep1Output {
  try {
    const result = napiRunSignClientStep1V2(msg, presignOutput0);
    return result;
  } catch (err: any) {
    console.error("Error calling runSignClientStep1:", err.message);
    throw err;
  }
}

export function runSignClientStep2(
  st0: SignState,
  msgs0: RcvdSignMessages,
  presignOutput0: PresignOutput,
): SignOutput {
  try {
    return napiRunSignClientStep2(st0, msgs0, presignOutput0);
  } catch (err: any) {
    console.error("Error calling runSignClientStep2:", err.message);
    throw err;
  }
}

export function runKeygenCombineShares(
  keyCombineInput: KeyCombineInput,
): string {
  try {
    return napiRunKeygenCombineShares(keyCombineInput);
  } catch (err: any) {
    console.error("Error calling runKeygenCombineShares:", err.message);
    throw err;
  }
}
