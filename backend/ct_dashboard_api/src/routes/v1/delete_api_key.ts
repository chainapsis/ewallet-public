import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  DeleteApiKeyRequestSchema,
  DeleteApiKeySuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import {
  deleteAPIKeyByKeyId,
  getAPIKeysByCustomerId,
} from "@oko-wallet/oko-pg-interface/api_keys";
import { getCustomerByUserId } from "@oko-wallet/oko-pg-interface/customers";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Response } from "express";

import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/api_keys/delete",
  tags: ["Customer Dashboard"],
  summary: "Delete an API key",
  description: "Permanently deletes an API key for the authenticated customer",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: DeleteApiKeyRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "API key deleted successfully",
      content: {
        "application/json": {
          schema: DeleteApiKeySuccessResponseSchema,
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
      description: "User not authenticated",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "API key or customer not found",
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

export async function deleteApiKey(
  req: CustomerAuthenticatedRequest<{ key_id: string }>,
  res: Response<OkoApiResponse<{ key_id: string }>>,
) {
  try {
    const state = req.app.locals;
    const { key_id } = req.body;

    if (!key_id) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: "key_id is required",
      });
      return;
    }

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

    const apiKeysRes = await getAPIKeysByCustomerId(
      state.db,
      customerRes.data.customer_id,
    );

    if (!apiKeysRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: apiKeysRes.err,
      });
      return;
    }

    const targetKey = apiKeysRes.data.find((key) => key.key_id === key_id);
    if (!targetKey) {
      res.status(404).json({
        success: false,
        code: "API_KEY_NOT_FOUND",
        msg: "API key not found",
      });
      return;
    }

    const deleteRes = await deleteAPIKeyByKeyId(state.db, key_id);

    if (!deleteRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: deleteRes.err,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { key_id },
    });
  } catch (error) {
    console.error("Delete API key error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
  }
}
