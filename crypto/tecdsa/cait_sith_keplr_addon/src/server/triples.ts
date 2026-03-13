import type {
  RcvdTriplesMessages,
  SrvTriplesStepOutput,
  TriplesGenManyResult,
  TriplesState,
} from "@oko-wallet/tecdsa-interface";

import {
  napiRunTriples2ServerStep1,
  napiRunTriples2ServerStep2,
  napiRunTriples2ServerStep3,
  napiRunTriples2ServerStep4,
  napiRunTriples2ServerStep5,
  napiRunTriples2ServerStep6,
  napiRunTriples2ServerStep7,
  napiRunTriples2ServerStep8,
  napiRunTriples2ServerStep9,
  napiRunTriples2ServerStep10,
  napiRunTriples2ServerStep11,
} from "../../addon/index.js";

export function runTriples2ServerStep1(): SrvTriplesStepOutput {
  try {
    const result = napiRunTriples2ServerStep1() as SrvTriplesStepOutput;

    return result;
  } catch (err: any) {
    console.error("Error calling runKeygenServerStep1:", err.message);
    throw err;
  }
}

export function runTriples2ServerStep2(
  st1: TriplesState,
  msgs1: RcvdTriplesMessages,
): SrvTriplesStepOutput {
  try {
    const result = napiRunTriples2ServerStep2(
      st1,
      msgs1,
    ) as SrvTriplesStepOutput;

    return result;
  } catch (err: any) {
    console.error("Error calling runTriples2ServerStep2:", err.message);
    throw err;
  }
}

export function runTriples2ServerStep3(
  st1: TriplesState,
  msgs1: RcvdTriplesMessages,
): SrvTriplesStepOutput {
  try {
    const result = napiRunTriples2ServerStep3(
      st1,
      msgs1,
    ) as SrvTriplesStepOutput;

    return result;
  } catch (err: any) {
    console.error("Error calling runTriples2ServerStep3:", err.message);
    throw err;
  }
}

export function runTriples2ServerStep4(
  st1: TriplesState,
  msgs1: RcvdTriplesMessages,
): SrvTriplesStepOutput {
  try {
    const result = napiRunTriples2ServerStep4(
      st1,
      msgs1,
    ) as SrvTriplesStepOutput;

    return result;
  } catch (err: any) {
    console.error("Error calling runTriples2ServerStep4:", err.message);
    throw err;
  }
}

export function runTriples2ServerStep5(
  st1: TriplesState,
  msgs1: RcvdTriplesMessages,
): SrvTriplesStepOutput {
  try {
    const result = napiRunTriples2ServerStep5(
      st1,
      msgs1,
    ) as SrvTriplesStepOutput;

    return result;
  } catch (err: any) {
    console.error("Error calling runTriplesServerStep5:", err.message);
    throw err;
  }
}

export function runTriples2ServerStep6(
  st1: TriplesState,
  msgs1: RcvdTriplesMessages,
): SrvTriplesStepOutput {
  try {
    const result = napiRunTriples2ServerStep6(
      st1,
      msgs1,
    ) as SrvTriplesStepOutput;

    return result;
  } catch (err: any) {
    console.error("Error calling runTriples2ServerStep6:", err.message);
    throw err;
  }
}

export function runTriples2ServerStep7(
  st1: TriplesState,
  msgs1: RcvdTriplesMessages,
): SrvTriplesStepOutput {
  try {
    const result = napiRunTriples2ServerStep7(
      st1,
      msgs1,
    ) as SrvTriplesStepOutput;

    return result;
  } catch (err: any) {
    console.error("Error calling runTriples2ServerStep7:", err.message);
    throw err;
  }
}

export function runTriples2ServerStep8(
  st1: TriplesState,
  msgs1: RcvdTriplesMessages,
): SrvTriplesStepOutput {
  try {
    const result = napiRunTriples2ServerStep8(
      st1,
      msgs1,
    ) as SrvTriplesStepOutput;

    return result;
  } catch (err: any) {
    console.error("Error calling runTriples2ServerStep8:", err.message);
    throw err;
  }
}

export function runTriples2ServerStep9(
  st1: TriplesState,
  msgs1: RcvdTriplesMessages,
): SrvTriplesStepOutput {
  try {
    const result = napiRunTriples2ServerStep9(
      st1,
      msgs1,
    ) as SrvTriplesStepOutput;

    return result;
  } catch (err: any) {
    console.error("Error calling runTriples2ServerStep9:", err.message);
    throw err;
  }
}

export function runTriples2ServerStep10(
  st1: TriplesState,
  msgs1: RcvdTriplesMessages,
): SrvTriplesStepOutput {
  try {
    const result = napiRunTriples2ServerStep10(
      st1,
      msgs1,
    ) as SrvTriplesStepOutput;

    return result;
  } catch (err: any) {
    console.error("Error calling runTriples2ServerStep10:", err.message);
    throw err;
  }
}

export function runTriples2ServerStep11(
  st1: TriplesState,
  msgs1: RcvdTriplesMessages,
): TriplesGenManyResult {
  try {
    const result = napiRunTriples2ServerStep11(
      st1,
      msgs1,
    ) as TriplesGenManyResult;

    return result;
  } catch (err: any) {
    console.error("Error calling runTriples2ServerStep11:", err.message);
    throw err;
  }
}
