import type {
  ClientTriplesStepOutput,
  RcvdTriplesMessages,
  TriplesGenManyResult,
  TriplesState,
} from "@oko-wallet/tecdsa-interface";

import {
  napiRunTriples2ClientStep1,
  napiRunTriples2ClientStep2,
  napiRunTriples2ClientStep3,
  napiRunTriples2ClientStep4,
  napiRunTriples2ClientStep5,
  napiRunTriples2ClientStep6,
  napiRunTriples2ClientStep7,
  napiRunTriples2ClientStep8,
  napiRunTriples2ClientStep9,
  napiRunTriples2ClientStep10,
  napiRunTriples2ClientStep11,
} from "../../addon/index.js";

export function runTriplesClientStep1(): ClientTriplesStepOutput {
  try {
    return napiRunTriples2ClientStep1();
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep1:", err.message);
    throw err;
  }
}

export function runTriplesClientStep2(
  st0: TriplesState,
  msgs0: RcvdTriplesMessages,
): ClientTriplesStepOutput {
  try {
    return napiRunTriples2ClientStep2(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep2:", err.message);
    throw err;
  }
}

// TODO: below steps
export function runTriplesClientStep3(
  st0: TriplesState,
  msgs0: RcvdTriplesMessages,
): ClientTriplesStepOutput {
  try {
    return napiRunTriples2ClientStep3(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep3:", err.message);
    throw err;
  }
}

export function runTriplesClientStep4(
  st0: TriplesState,
  msgs0: RcvdTriplesMessages,
): ClientTriplesStepOutput {
  try {
    return napiRunTriples2ClientStep4(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep4:", err.message);
    throw err;
  }
}

export function runTriplesClientStep5(
  st0: TriplesState,
  msgs0: RcvdTriplesMessages,
): ClientTriplesStepOutput {
  try {
    return napiRunTriples2ClientStep5(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep5:", err.message);
    throw err;
  }
}

export function runTriplesClientStep6(
  st0: TriplesState,
  msgs0: RcvdTriplesMessages,
): ClientTriplesStepOutput {
  try {
    return napiRunTriples2ClientStep6(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep6:", err.message);
    throw err;
  }
}

export function runTriplesClientStep7(
  st0: TriplesState,
  msgs0: RcvdTriplesMessages,
): ClientTriplesStepOutput {
  try {
    return napiRunTriples2ClientStep7(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep7:", err.message);
    throw err;
  }
}

export function runTriplesClientStep8(
  st0: TriplesState,
  msgs0: RcvdTriplesMessages,
): ClientTriplesStepOutput {
  try {
    return napiRunTriples2ClientStep8(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep8:", err.message);
    throw err;
  }
}

export function runTriplesClientStep9(
  st0: TriplesState,
  msgs0: RcvdTriplesMessages,
): ClientTriplesStepOutput {
  try {
    return napiRunTriples2ClientStep9(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep9:", err.message);
    throw err;
  }
}

export function runTriplesClientStep10(
  st0: TriplesState,
  msgs0: RcvdTriplesMessages,
): ClientTriplesStepOutput {
  try {
    return napiRunTriples2ClientStep10(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep10:", err.message);
    throw err;
  }
}

export function runTriplesClientStep11(
  st0: TriplesState,
  msgs0: RcvdTriplesMessages,
): TriplesGenManyResult {
  try {
    return napiRunTriples2ClientStep11(st0, msgs0);
  } catch (err: any) {
    console.error("Error calling runKeygenClientStep11:", err.message);
    throw err;
  }
}
