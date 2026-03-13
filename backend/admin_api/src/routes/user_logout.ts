import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  AdminAuthHeaderSchema,
  ErrorResponseSchema,
} from "@oko-wallet/oko-api-openapi/common";
import { AdminLogoutSuccessResponseSchema } from "@oko-wallet/oko-api-openapi/oko_admin";
import type { AdminLogoutResponse } from "@oko-wallet/oko-types/admin";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Response } from "express";

import { logout } from "@oko-wallet-admin-api/api/user";
import type { AuthenticatedAdminRequest } from "@oko-wallet-admin-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/oko_admin/v1/user/logout",
  tags: ["Admin"],
  summary: "Admin logout",
  description: "Logs out an admin user",
  security: [{ adminAuth: [] }],
  request: {
    headers: AdminAuthHeaderSchema,
  },
  responses: {
    200: {
      description: "Successfully logged out",
      content: {
        "application/json": {
          schema: AdminLogoutSuccessResponseSchema,
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

export async function user_logout(
  req: AuthenticatedAdminRequest,
  res: Response<OkoApiResponse<AdminLogoutResponse>>,
) {
  const state = req.app.locals;

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : undefined;

  const result = await logout(state.db, token);
  if (result.success === false) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
