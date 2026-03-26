import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import { CustomerAuthHeaderSchema } from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  UpdateCustomerInfoRequest,
  UpdateCustomerInfoResponse,
} from "@oko-wallet/oko-types/customers";
import type { Response } from "express";

import { updateCustomerInfoRequest } from "@oko-wallet-usrd-api/api/customer_info";
import type { CustomerAuthenticatedRequest } from "@oko-wallet-usrd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/update_info",
  tags: ["Customer Dashboard"],
  summary: "Update customer information",
  description: "Updates customer label and/or logo. Logo is uploaded to S3.",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description: "Customer/Team name",
              },
              url: {
                type: "string",
                description: "App URL",
              },
              logo: {
                type: "string",
                format: "binary",
                description: "Logo image file (128×128 px, under 1 MB, no SVG)",
              },
              delete_logo: {
                type: "string",
                enum: ["true"],
                description: "Set to 'true' to delete existing logo",
              },
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Customer information updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid input",
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

export async function updateCustomerInfoRoute(
  req: CustomerAuthenticatedRequest<UpdateCustomerInfoRequest> & {
    file?: Express.Multer.File;
  },
  res: Response<OkoApiResponse<UpdateCustomerInfoResponse>>,
) {
  const state = req.app.locals;
  const userId = res.locals.user_id;

  const result = await updateCustomerInfoRequest(
    state.db,
    userId,
    req.body,
    req.file,
    {
      s3_region: state.s3_region,
      s3_access_key_id: state.s3_access_key_id,
      s3_secret_access_key: state.s3_secret_access_key,
      s3_bucket: state.s3_bucket,
    },
  );

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
