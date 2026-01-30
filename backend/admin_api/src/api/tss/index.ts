import { getTssSessions } from "@oko-wallet/oko-pg-interface/tss";
import {
  getTssActivationSetting as getTssAllActivationSettingPG,
  setTssActivationSetting as setTssAllActivationSettingPG,
} from "@oko-wallet/oko-pg-interface/tss_activate";
import type {
  GetTssAllActivationSettingResponse,
  GetTssSessionListRequest,
  GetTssSessionListResponse,
  SetTssAllActivationSettingRequest,
  SetTssAllActivationSettingResponse,
} from "@oko-wallet/oko-types/admin";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Pool } from "pg";

export async function getTssSessionList(
  db: Pool,
  body: GetTssSessionListRequest,
): Promise<OkoApiResponse<GetTssSessionListResponse>> {
  try {
    let { limit, offset, node_id, customer_id, curve_type } = body;
    if (!limit || !offset) {
      limit = 10;
      offset = 0;
    } else {
      limit = Number(limit);
      offset = Number(offset);
    }

    const getTssSessionsRes = await getTssSessions(
      db,
      limit + 1,
      offset,
      node_id,
      customer_id,
      curve_type,
    );
    if (getTssSessionsRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get tss sessions: ${getTssSessionsRes.err}`,
      };
    }

    const tssSessionsPlusOne = getTssSessionsRes.data;
    const has_next = tssSessionsPlusOne.length > limit;
    const has_prev = offset > 0;

    const tssSessions = has_next
      ? tssSessionsPlusOne.slice(0, limit)
      : tssSessionsPlusOne;

    return {
      success: true,
      data: {
        tss_sessions: tssSessions,
        pagination: {
          has_next,
          has_prev,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to get tss session list: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getTssAllActivationSetting(
  db: Pool,
): Promise<OkoApiResponse<GetTssAllActivationSettingResponse>> {
  try {
    const getTssActivationRes = await getTssAllActivationSettingPG(
      db,
      "tss_all",
    );
    if (getTssActivationRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get tss activation setting: ${getTssActivationRes.err}`,
      };
    }

    if (!getTssActivationRes.data) {
      return {
        success: false,
        code: "TSS_ACTIVATION_SETTING_NOT_FOUND",
        msg: "TSS activation setting not found",
      };
    }

    return {
      success: true,
      data: {
        tss_activation_setting: getTssActivationRes.data,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to get tss activation setting: ${error}`,
    };
  }
}

export async function setTssAllActivationSetting(
  db: Pool,
  body: SetTssAllActivationSettingRequest,
): Promise<OkoApiResponse<SetTssAllActivationSettingResponse>> {
  try {
    const { is_enabled } = body;

    const getTssActivationRes = await getTssAllActivationSettingPG(
      db,
      "tss_all",
    );
    if (getTssActivationRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to get tss activation setting: ${getTssActivationRes.err}`,
      };
    }

    const tssActivationSetting = getTssActivationRes.data;
    if (!tssActivationSetting) {
      return {
        success: false,
        code: "TSS_ACTIVATION_SETTING_NOT_FOUND",
        msg: "TSS activation setting not found",
      };
    }

    const setTssActivationRes = await setTssAllActivationSettingPG(
      db,
      is_enabled,
      tssActivationSetting.activation_key,
    );
    if (setTssActivationRes.success === false) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: `Failed to set tss activation setting: ${setTssActivationRes.err}`,
      };
    }

    return {
      success: true,
      data: {
        tss_activation_setting: setTssActivationRes.data,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `Failed to set tss activation setting: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
