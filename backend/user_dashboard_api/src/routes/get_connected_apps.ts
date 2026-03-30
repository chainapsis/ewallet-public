import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import {
  ErrorResponseSchema,
  SuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/common";
import { CustomerAuthHeaderSchema } from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { ConnectedApp } from "@oko-wallet/oko-types/user_dashboard";
import type { Response } from "express";

import { getConnectedAppsRequest } from "@oko-wallet-usrd-api/api/user";
import type { UserAuthenticatedRequest } from "@oko-wallet-usrd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/user_dashboard/v1/get_connected_apps",
  tags: ["User Dashboard"],
  summary: "Get connected apps",
  description:
    "Retrieves connected applications for the authenticated user (uses TSS API JWT)",
  security: [{ userAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
  },
  responses: {
    200: {
      description: "Connected apps retrieved successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
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

export async function getConnectedApps(
  req: UserAuthenticatedRequest,
  res: Response<OkoApiResponse<ConnectedApp[]>>,
) {
  const state = req.app.locals;
  const { wallet_id_secp256k1 } = res.locals.user as {
    email: string;
    wallet_id_secp256k1: string;
    wallet_id_ed25519: string;
  };

  const result = await getConnectedAppsRequest(state.db, wallet_id_secp256k1);

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
