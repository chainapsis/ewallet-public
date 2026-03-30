import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  AdminAuthHeaderSchema,
  ErrorResponseSchema,
} from "@oko-wallet/oko-api-openapi/common";
import {
  DeleteKSNodeRequestSchema,
  DeleteKSNodeSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/oko_admin";
import type {
  DeleteKSNodeRequest,
  DeleteKSNodeResponse,
} from "@oko-wallet/oko-types/admin";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Response } from "express";

import { deleteKSNode } from "@oko-wallet-admin-api/api/ks_node";
import type { AuthenticatedAdminRequest } from "@oko-wallet-admin-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/oko_admin/v1/ks_node/delete_ks_node",
  tags: ["Admin"],
  summary: "Delete key share node",
  description: "Deletes a key share node",
  security: [{ adminAuth: [] }],
  request: {
    headers: AdminAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: DeleteKSNodeRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Key share node deleted successfully",
      content: {
        "application/json": {
          schema: DeleteKSNodeSuccessResponseSchema,
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

export async function delete_ks_node(
  req: AuthenticatedAdminRequest<DeleteKSNodeRequest>,
  res: Response<OkoApiResponse<DeleteKSNodeResponse>>,
) {
  const state = req.app.locals;

  const result = await deleteKSNode(state.db, req.body);
  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
