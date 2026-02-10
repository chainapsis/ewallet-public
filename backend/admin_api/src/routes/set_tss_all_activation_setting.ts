import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  AdminAuthHeaderSchema,
  ErrorResponseSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  SetTssAllActivationSettingRequestSchema,
  SetTssAllActivationSettingSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/oko_admin";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Response } from "express";

import { setTssAllActivationSetting } from "@oko-wallet-admin-api/api/tss";
import type { AuthenticatedAdminRequest } from "@oko-wallet-admin-api/middleware/auth";
import type {
  SetTssAllActivationSettingRequest,
  SetTssAllActivationSettingResponse,
} from "@oko-wallet-types/admin";

registry.registerPath({
  method: "post",
  path: "/oko_admin/v1/tss/set_tss_all_activation_setting",
  tags: ["Admin"],
  summary: "Set TSS activation setting",
  description: "Enable or disable TSS functionality for all users",
  security: [{ adminAuth: [] }],
  request: {
    headers: AdminAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: SetTssAllActivationSettingRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "TSS activation setting updated successfully",
      content: {
        "application/json": {
          schema: SetTssAllActivationSettingSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export async function set_tss_all_activation_setting(
  req: AuthenticatedAdminRequest<SetTssAllActivationSettingRequest>,
  res: Response<OkoApiResponse<SetTssAllActivationSettingResponse>>,
) {
  const state = req.app.locals;

  const result = await setTssAllActivationSetting(state.db, req.body);

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
