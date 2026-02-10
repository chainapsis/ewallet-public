import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  AdminAuthHeaderSchema,
  ErrorResponseSchema,
} from "@oko-wallet/oko-api-openapi/common";
import { GetTssAllActivationSettingSuccessResponseSchema } from "@oko-wallet/oko-api-openapi/oko_admin";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Response } from "express";

import { getTssAllActivationSetting } from "@oko-wallet-admin-api/api/tss";
import type { AuthenticatedAdminRequest } from "@oko-wallet-admin-api/middleware/auth";
import type { GetTssAllActivationSettingResponse } from "@oko-wallet-types/admin";

registry.registerPath({
  method: "post",
  path: "/oko_admin/v1/tss/get_tss_all_activation_setting",
  tags: ["Admin"],
  summary: "Get TSS activation setting",
  description: "Retrieves the current TSS activation setting",
  security: [{ adminAuth: [] }],
  request: {
    headers: AdminAuthHeaderSchema,
  },
  responses: {
    200: {
      description: "TSS activation setting retrieved successfully",
      content: {
        "application/json": {
          schema: GetTssAllActivationSettingSuccessResponseSchema,
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

export async function get_tss_all_activation_setting(
  req: AuthenticatedAdminRequest,
  res: Response<OkoApiResponse<GetTssAllActivationSettingResponse>>,
) {
  const state = req.app.locals;

  const result = await getTssAllActivationSetting(state.db);
  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
