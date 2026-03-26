import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  GetCustomerInfoSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Customer } from "@oko-wallet/oko-types/customers";
import type { Response } from "express";

import { getCustomerInfoRequest } from "@oko-wallet-ctd-api/api/customer_info";
import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

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
  const state = req.app.locals;

  const result = await getCustomerInfoRequest(state.db, res.locals.user_id);

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
