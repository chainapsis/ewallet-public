import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CreateApiKeySuccessResponseSchema,
  CustomerAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import { insertAPIKey } from "@oko-wallet/oko-pg-interface/api_keys";
import { getCustomerByUserId } from "@oko-wallet/oko-pg-interface/customers";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { APIKey } from "@oko-wallet/oko-types/ct_dashboard";
import { randomBytes } from "crypto";
import type { Response } from "express";

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
  try {
    const state = req.app.locals;

    const customerRes = await getCustomerByUserId(state.db, res.locals.user_id);

    if (!customerRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: customerRes.err,
      });
      return;
    }

    if (customerRes.data === null) {
      res.status(404).json({
        success: false,
        code: "CUSTOMER_NOT_FOUND",
        msg: "Customer not found",
      });
      return;
    }

    const apiKey = randomBytes(32).toString("hex");
    const insertRes = await insertAPIKey(
      state.db,
      customerRes.data.customer_id,
      apiKey,
    );

    if (!insertRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: insertRes.err,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: insertRes.data,
    });
  } catch (error) {
    console.error("Create API key error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
  }
}
