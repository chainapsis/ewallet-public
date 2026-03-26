import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  LeaveTeamRequestSchema,
  LeaveTeamSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { LeaveTeamRequest } from "@oko-wallet/oko-types/ct_dashboard";
import type { Response } from "express";

import { leaveTeamRequest } from "@oko-wallet-ctd-api/api/team_management";
import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/team/leave",
  tags: ["Customer Dashboard - Team"],
  summary: "Leave team",
  description: "Leave the team. Scenario depends on role and team composition.",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: LeaveTeamRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Left team",
      content: {
        "application/json": {
          schema: LeaveTeamSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Target user required or invalid request",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
    404: {
      description: "Target user not found",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
  },
});

export async function leaveTeam(
  req: CustomerAuthenticatedRequest<LeaveTeamRequest>,
  res: Response<OkoApiResponse<unknown>>,
) {
  const state = req.app.locals;
  const userId = res.locals.user_id;
  const { customer_id, role } = res.locals.team;

  const result = await leaveTeamRequest(state.db, req.body, {
    user_id: userId,
    customer_id,
    role,
  });

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
