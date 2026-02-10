import { uploadToS3 } from "@oko-wallet/aws";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  GetCustomerApiKeysRequestSchema,
  GetCustomerApiKeysSuccessResponseSchema,
  GetCustomerInfoSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import { getAPIKeysByCustomerId } from "@oko-wallet/oko-pg-interface/api_keys";
import {
  getCustomerByUserId,
  updateCustomerInfo,
} from "@oko-wallet/oko-pg-interface/customers";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { APIKey } from "@oko-wallet/oko-types/ct_dashboard";
import type {
  Customer,
  UpdateCustomerInfoRequest,
  UpdateCustomerInfoResponse,
} from "@oko-wallet/oko-types/customers";
import { randomUUID } from "crypto";
import type { Response, Router } from "express";
import sharp from "sharp";

import {
  type CustomerAuthenticatedRequest,
  customerJwtMiddleware,
} from "@oko-wallet-usrd-api/middleware/auth";
import { multerMiddleware } from "@oko-wallet-usrd-api/middleware/multer";
import { rateLimitMiddleware } from "@oko-wallet-usrd-api/middleware/rate_limit";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/info",
  tags: ["Customer Dashboard"],
  summary: "Get customer information",
  description: "Retrieves customer information for the authenticated user",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
  },
  responses: {
    200: {
      description: "Customer information retrieved successfully",
      content: {
        "application/json": {
          schema: GetCustomerInfoSuccessResponseSchema,
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

export async function getCustomerInfo(
  req: CustomerAuthenticatedRequest,
  res: Response<OkoApiResponse<Customer>>,
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

    res.status(200).json({
      success: true,
      data: customerRes.data,
    });
    return;
  } catch (error) {
    console.error("Get customer info error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
    return;
  }
}
