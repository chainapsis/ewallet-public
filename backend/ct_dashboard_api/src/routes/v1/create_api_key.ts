import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CreateApiKeySuccessResponseSchema,
  CustomerAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { APIKey } from "@oko-wallet/oko-types/ct_dashboard";
import type { Response } from "express";

import { createApiKeyRequest } from "@oko-wallet-ctd-api/api/customer_info";
import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/api_keys/create",
  tags: ["Customer Dashboard"],
  summary: "Create a new API key",
  description: "Creates a new API key for the authenticated customer",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
  },
  responses: {
    200: {
      description: "API key created successfully",
      content: {
        "application/json": {
          schema: CreateApiKeySuccessResponseSchema,
        },
      },
    },
    401: {
      description: "User not authenticated",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Customer not found",
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

export async function createApiKey(
  req: CustomerAuthenticatedRequest,
  res: Response<OkoApiResponse<APIKey>>,
) {
  const state = req.app.locals;

  const result = await createApiKeyRequest(state.db, res.locals.user_id);

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
