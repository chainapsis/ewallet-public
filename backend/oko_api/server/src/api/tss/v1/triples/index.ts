import {
  runTriples2ServerStep1,
  runTriples2ServerStep2,
  runTriples2ServerStep3,
  runTriples2ServerStep4,
  runTriples2ServerStep5,
  runTriples2ServerStep6,
  runTriples2ServerStep7,
  runTriples2ServerStep8,
  runTriples2ServerStep9,
  runTriples2ServerStep10,
  runTriples2ServerStep11,
} from "@oko-wallet/cait-sith-keplr-addon/src/server/triples";
import {
  createTssSession,
  createTssStage,
  getTssStageWithSessionData,
  updateTssStage,
} from "@oko-wallet/oko-pg-interface/tss";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  TriplesStageData,
  TriplesStep1Request,
  TriplesStep1Response,
  TriplesStep2Request,
  TriplesStep2Response,
  TriplesStep3Request,
  TriplesStep3Response,
  TriplesStep4Request,
  TriplesStep4Response,
  TriplesStep5Request,
  TriplesStep5Response,
  TriplesStep6Request,
  TriplesStep6Response,
  TriplesStep7Request,
  TriplesStep7Response,
  TriplesStep8Request,
  TriplesStep8Response,
  TriplesStep9Request,
  TriplesStep9Response,
  TriplesStep10Request,
  TriplesStep10Response,
  TriplesStep11Request,
  TriplesStep11Response,
} from "@oko-wallet/oko-types/tss";
import { TriplesStageStatus, TssStageType } from "@oko-wallet/oko-types/tss";
import { Participant, type TriplePub } from "@oko-wallet/tecdsa-interface";
import type { Pool } from "pg";

import {
  validateCustomer,
  validateTssSession,
  validateTssStage,
  validateWalletEmailAndCurveType,
} from "@oko-wallet-api/api/tss/utils";

export async function runTriplesStep1(
  db: Pool,
  triplesStep1Request: TriplesStep1Request,
): Promise<OkoApiResponse<TriplesStep1Response>> {
  try {
    const { email, wallet_id, customer_id, msgs_1 } = triplesStep1Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const validateCustomerRes = await validateCustomer(db, customer_id);
    if (validateCustomerRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateCustomerRes.err,
      };
    }

    const createTssSessionRes = await createTssSession(db, {
      wallet_id: wallet.wallet_id,
      customer_id,
    });
    if (createTssSessionRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `createTssSession error: ${createTssSessionRes.err}`,
      };
    }

    const session = createTssSessionRes.data;

    const triplesStep1Result = runTriples2ServerStep1();

    const createTssStageRes = await createTssStage(db, {
      session_id: session.session_id,
      stage_type: TssStageType.TRIPLES,
      stage_status: TriplesStageStatus.STEP_1,
      stage_data: {
        triple_state: triplesStep1Result.st_1,
        triple_messages: msgs_1,
        triple_pub_0: null,
        triple_pub_1: null,
        triple_share_0: null,
        triple_share_1: null,
      },
    });
    if (createTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `createTssStage error: ${createTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        session_id: session.session_id,
        msgs_0: triplesStep1Result.msgs_0,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runTriplesStep1 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runTriplesStep2(
  db: Pool,
  triplesStep2Request: TriplesStep2Request,
): Promise<OkoApiResponse<TriplesStep2Response>> {
  try {
    const { email, wallet_id, session_id, wait_1 } = triplesStep2Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const triplesStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(triplesStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(triplesStage, TriplesStageStatus.STEP_1)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const triplesData = triplesStage.stage_data as TriplesStageData;
    triplesData.triple_messages!.wait_1[Participant.P0] = wait_1;

    const triplesStep2Result = runTriples2ServerStep2(
      triplesData.triple_state!,
      triplesData.triple_messages!,
    );
    triplesData.triple_state = triplesStep2Result.st_1;

    const updateTssStageRes = await updateTssStage(db, triplesStage.stage_id, {
      stage_status: TriplesStageStatus.STEP_2,
      stage_data: triplesData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        wait_1: triplesStep2Result.msgs_0.wait_1[Participant.P1]!,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runTriplesStep2 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runTriplesStep3(
  db: Pool,
  triplesStep3Request: TriplesStep3Request,
): Promise<OkoApiResponse<TriplesStep3Response>> {
  try {
    const { email, wallet_id, session_id, wait_2 } = triplesStep3Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const triplesStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(triplesStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(triplesStage, TriplesStageStatus.STEP_2)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const triplesData = triplesStage.stage_data as TriplesStageData;
    triplesData.triple_messages!.wait_2[Participant.P0] = wait_2;

    const triplesStep3Result = runTriples2ServerStep3(
      triplesData.triple_state!,
      triplesData.triple_messages!,
    );
    triplesData.triple_state = triplesStep3Result.st_1;

    const updateTssStageRes = await updateTssStage(db, triplesStage.stage_id, {
      stage_status: TriplesStageStatus.STEP_3,
      stage_data: triplesData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        wait_2: triplesStep3Result.msgs_0.wait_2[Participant.P1]!,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runTriplesStep3 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runTriplesStep4(
  db: Pool,
  triplesStep4Request: TriplesStep4Request,
): Promise<OkoApiResponse<TriplesStep4Response>> {
  try {
    const { email, wallet_id, session_id, wait_3 } = triplesStep4Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const triplesStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(triplesStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(triplesStage, TriplesStageStatus.STEP_3)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const triplesData = triplesStage.stage_data as TriplesStageData;
    triplesData.triple_messages!.wait_3[Participant.P0] = wait_3;

    const triplesStep4Result = runTriples2ServerStep4(
      triplesData.triple_state!,
      triplesData.triple_messages!,
    );
    triplesData.triple_state = triplesStep4Result.st_1;

    const updateTssStageRes = await updateTssStage(db, triplesStage.stage_id, {
      stage_status: TriplesStageStatus.STEP_4,
      stage_data: triplesData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        wait_3: triplesStep4Result.msgs_0.wait_3[Participant.P1]!,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runTriplesStep4 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runTriplesStep5(
  db: Pool,
  triplesStep5Request: TriplesStep5Request,
): Promise<OkoApiResponse<TriplesStep5Response>> {
  try {
    const { email, wallet_id, session_id, wait_4 } = triplesStep5Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const triplesStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(triplesStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(triplesStage, TriplesStageStatus.STEP_4)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const triplesData = triplesStage.stage_data as TriplesStageData;
    triplesData.triple_messages!.wait_4[Participant.P0] = wait_4;

    const triplesStep5Result = runTriples2ServerStep5(
      triplesData.triple_state!,
      triplesData.triple_messages!,
    );
    triplesData.triple_state = triplesStep5Result.st_1;

    const updateTssStageRes = await updateTssStage(db, triplesStage.stage_id, {
      stage_status: TriplesStageStatus.STEP_5,
      stage_data: triplesData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        wait_4: triplesStep5Result.msgs_0.wait_4[Participant.P1]!,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runTriplesStep5 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runTriplesStep6(
  db: Pool,
  triplesStep6Request: TriplesStep6Request,
): Promise<OkoApiResponse<TriplesStep6Response>> {
  try {
    const { email, wallet_id, session_id, batch_random_ot_wait_0 } =
      triplesStep6Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const triplesStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(triplesStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(triplesStage, TriplesStageStatus.STEP_5)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const triplesData = triplesStage.stage_data as TriplesStageData;
    triplesData.triple_messages!.batch_random_ot_wait_0[Participant.P0] =
      batch_random_ot_wait_0;

    const triplesStep6Result = runTriples2ServerStep6(
      triplesData.triple_state!,
      triplesData.triple_messages!,
    );
    triplesData.triple_state = triplesStep6Result.st_1;

    const updateTssStageRes = await updateTssStage(db, triplesStage.stage_id, {
      stage_status: TriplesStageStatus.STEP_6,
      stage_data: triplesData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        batch_random_ot_wait_0:
          triplesStep6Result.msgs_0.batch_random_ot_wait_0[Participant.P1]!,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runTriplesStep6 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runTriplesStep7(
  db: Pool,
  triplesStep7Request: TriplesStep7Request,
): Promise<OkoApiResponse<TriplesStep7Response>> {
  try {
    const { email, wallet_id, session_id, correlated_ot_wait_0 } =
      triplesStep7Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const triplesStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(triplesStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(triplesStage, TriplesStageStatus.STEP_6)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const triplesData = triplesStage.stage_data as TriplesStageData;
    triplesData.triple_messages!.correlated_ot_wait_0[Participant.P0] =
      correlated_ot_wait_0;

    const triplesStep7Result = runTriples2ServerStep7(
      triplesData.triple_state!,
      triplesData.triple_messages!,
    );
    triplesData.triple_state = triplesStep7Result.st_1;

    const updateTssStageRes = await updateTssStage(db, triplesStage.stage_id, {
      stage_status: TriplesStageStatus.STEP_7,
      stage_data: triplesData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        random_ot_extension_wait_0:
          triplesStep7Result.msgs_0.random_ot_extension_wait_0[Participant.P1]!,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runTriplesStep7 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runTriplesStep8(
  db: Pool,
  triplesStep8Request: TriplesStep8Request,
): Promise<OkoApiResponse<TriplesStep8Response>> {
  try {
    const { email, wallet_id, session_id, random_ot_extension_wait_1 } =
      triplesStep8Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const triplesStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(triplesStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(triplesStage, TriplesStageStatus.STEP_7)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const triplesData = triplesStage.stage_data as TriplesStageData;
    triplesData.triple_messages!.random_ot_extension_wait_1[Participant.P0] =
      random_ot_extension_wait_1;

    const triplesStep8Result = runTriples2ServerStep8(
      triplesData.triple_state!,
      triplesData.triple_messages!,
    );
    triplesData.triple_state = triplesStep8Result.st_1;

    const updateTssStageRes = await updateTssStage(db, triplesStage.stage_id, {
      stage_status: TriplesStageStatus.STEP_8,
      stage_data: triplesData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        mta_wait_0: triplesStep8Result.msgs_0.mta_wait_0[Participant.P1]!,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runTriplesStep8 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runTriplesStep9(
  db: Pool,
  triplesStep9Request: TriplesStep9Request,
): Promise<OkoApiResponse<TriplesStep9Response>> {
  try {
    const { email, wallet_id, session_id, mta_wait_1 } = triplesStep9Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const triplesStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(triplesStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(triplesStage, TriplesStageStatus.STEP_8)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const triplesData = triplesStage.stage_data as TriplesStageData;
    triplesData.triple_messages!.mta_wait_1[Participant.P0] = mta_wait_1;

    const triplesStep9Result = runTriples2ServerStep9(
      triplesData.triple_state!,
      triplesData.triple_messages!,
    );
    triplesData.triple_state = triplesStep9Result.st_1;

    const updateTssStageRes = await updateTssStage(db, triplesStage.stage_id, {
      stage_status: TriplesStageStatus.STEP_9,
      stage_data: triplesData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        is_success: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runTriplesStep9 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runTriplesStep10(
  db: Pool,
  triplesStep10Request: TriplesStep10Request,
): Promise<OkoApiResponse<TriplesStep10Response>> {
  try {
    const { email, wallet_id, session_id, wait_5, wait_6 } =
      triplesStep10Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const triplesStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(triplesStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(triplesStage, TriplesStageStatus.STEP_9)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const triplesData = triplesStage.stage_data as TriplesStageData;
    triplesData.triple_messages!.wait_5[Participant.P0] = wait_5;
    triplesData.triple_messages!.wait_6[Participant.P0] = wait_6;

    const triplesStep10Result = runTriples2ServerStep10(
      triplesData.triple_state!,
      triplesData.triple_messages!,
    );
    triplesData.triple_state = triplesStep10Result.st_1;

    const updateTssStageRes = await updateTssStage(db, triplesStage.stage_id, {
      stage_status: TriplesStageStatus.STEP_10,
      stage_data: triplesData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        wait_5: triplesStep10Result.msgs_0.wait_5[Participant.P1]!,
        wait_6: triplesStep10Result.msgs_0.wait_6[Participant.P1]!,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runTriplesStep10 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runTriplesStep11(
  db: Pool,
  triplesStep11Request: TriplesStep11Request,
): Promise<OkoApiResponse<TriplesStep11Response>> {
  try {
    const { email, wallet_id, session_id, pub_v } = triplesStep11Request;

    const validateWalletEmailAndCurveTypeRes =
      await validateWalletEmailAndCurveType(db, wallet_id, email, "secp256k1");
    if (validateWalletEmailAndCurveTypeRes.success === false) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        msg: validateWalletEmailAndCurveTypeRes.err,
      };
    }
    const wallet = validateWalletEmailAndCurveTypeRes.data;

    const getTssStageWithSessionDataRes = await getTssStageWithSessionData(
      db,
      session_id,
      TssStageType.TRIPLES,
    );
    if (getTssStageWithSessionDataRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `getTssStageWithSessionData error: ${getTssStageWithSessionDataRes.err}`,
      };
    }

    const triplesStage = getTssStageWithSessionDataRes.data;

    if (!validateTssSession(triplesStage, wallet.wallet_id)) {
      return {
        success: false,
        code: "INVALID_TSS_SESSION",
        msg: `Invalid tss session: ${session_id}`,
      };
    }

    if (!validateTssStage(triplesStage, TriplesStageStatus.STEP_10)) {
      return {
        success: false,
        code: "INVALID_TSS_STAGE",
        msg: `Invalid tss stage: ${session_id}`,
      };
    }

    const triplesData = triplesStage.stage_data as TriplesStageData;

    const triplesStep11Result = runTriples2ServerStep11(
      triplesData.triple_state!,
      triplesData.triple_messages!,
    );
    if (!isPubVEqual(pub_v, triplesStep11Result.pub_v)) {
      return {
        success: false,
        code: "INVALID_TSS_TRIPLES_RESULT",
        msg: `Invalid triples result: ${pub_v}`,
      };
    }

    triplesData.triple_pub_0 = triplesStep11Result.pub_v[0];
    triplesData.triple_pub_1 = triplesStep11Result.pub_v[1];
    triplesData.triple_share_0 = triplesStep11Result.share_v[0];
    triplesData.triple_share_1 = triplesStep11Result.share_v[1];

    const updateTssStageRes = await updateTssStage(db, triplesStage.stage_id, {
      stage_status: TriplesStageStatus.COMPLETED,
      stage_data: triplesData,
    });
    if (updateTssStageRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `updateTssStage error: ${updateTssStageRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        pub_v: triplesStep11Result.pub_v,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `runTriplesStep11 error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function isPubVEqual(a: TriplePub[], b: TriplePub[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    const pubA = a[i];
    const pubB = b[i];

    if (
      pubA.big_a !== pubB.big_a ||
      pubA.big_b !== pubB.big_b ||
      pubA.big_c !== pubB.big_c ||
      pubA.threshold !== pubB.threshold ||
      pubA.participants.length !== pubB.participants.length ||
      !pubA.participants.every((p, idx) => p === pubB.participants[idx])
    ) {
      return false;
    }
  }

  return true;
}
