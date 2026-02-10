import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  GetCustomerApiKeysRequestSchema,
  GetCustomerApiKeysSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import { getAPIKeysByCustomerId } from "@oko-wallet/oko-pg-interface/api_keys";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { APIKey } from "@oko-wallet/oko-types/ct_dashboard";
import type { Response } from "express";

import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

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
  try {
    const state = req.app.locals;

    const apiKeys = await getAPIKeysByCustomerId(
      state.db,
      req.body.customer_id,
    );

    if (!apiKeys.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: apiKeys.err,
      });
      return;
    }

    if (apiKeys.data.length === 0) {
      res.status(404).json({
        success: false,
        code: "API_KEYS_NOT_FOUND",
        msg: "No API keys found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: apiKeys.data,
    });
  } catch (error) {
    console.error("Get API keys error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
  }
}
