import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  GetCustomerApiKeysRequestSchema,
  GetCustomerApiKeysSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { APIKey } from "@oko-wallet/oko-types/ct_dashboard";
import type { Response } from "express";

import { getCustomerApiKeysRequest } from "@oko-wallet-usrd-api/api/customer_info";
import type { CustomerAuthenticatedRequest } from "@oko-wallet-usrd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/api_keys",
  tags: ["Customer Dashboard"],
  summary: "Get customer API keys",
  description: "Retrieves API keys for the specified customer",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: GetCustomerApiKeysRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "API keys retrieved successfully",
      content: {
        "application/json": {
          schema: GetCustomerApiKeysSuccessResponseSchema,
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
      description: "API keys not found",
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

export async function getCustomerApiKeys(
  req: CustomerAuthenticatedRequest<{ customer_id: string }>,
  res: Response<OkoApiResponse<APIKey[]>>,
) {
  const state = req.app.locals;

  const result = await getCustomerApiKeysRequest(
    state.db,
    req.body.customer_id,
  );

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
