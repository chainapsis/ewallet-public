import type { Request, Response } from "express";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { CustomerTheme } from "@oko-wallet/oko-types/customers";
import { getCustomerThemeByHostOrigin } from "@oko-wallet/oko-pg-interface/attached";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  GetAttachedThemeQuerySchema,
  GetAttachedThemeSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/attached";

interface GetThemeByHostOriginReq {
  host_origin: string;
}

registry.registerPath({
  method: "get",
  path: "/attached/v1/theme/get",
  tags: ["Attached"],
  summary: "Get customer theme by host origin",
  description: "Returns the customer theme for the provided host origin",
  request: {
    query: GetAttachedThemeQuerySchema,
  },
  responses: {
    200: {
      description: "Theme retrieved successfully",
      content: {
        "application/json": {
          schema: GetAttachedThemeSuccessResponseSchema,
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

export async function getTheme(
  req: Request<GetThemeByHostOriginReq>,
  res: Response<OkoApiResponse<CustomerTheme>>,
) {
  try {
    const { host_origin: hostOrigin } = req.query;
    const state = req.app.locals;

    if (
      !hostOrigin ||
      typeof hostOrigin !== "string" ||
      hostOrigin.length === 0
    ) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: "host_origin query parameter is required",
      });
      return;
    }

    const themeRes = await getCustomerThemeByHostOrigin(state.db, hostOrigin);

    if (!themeRes.success) {
      if (themeRes.err === "Customer not found") {
        res.status(404).json({
          success: false,
          code: "CUSTOMER_NOT_FOUND",
          msg: "Customer not found",
        });
        return;
      }

      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: themeRes.err,
      });
      return;
    }

    if (themeRes.data === null) {
      res.status(404).json({
        success: false,
        code: "CUSTOMER_NOT_FOUND",
        msg: "Customer not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: themeRes.data.theme,
    });
    return;
  } catch (error) {
    console.error("Get customer theme by host origin error:", error);
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
    return;
  }
}
