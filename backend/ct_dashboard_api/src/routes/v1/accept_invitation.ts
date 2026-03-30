import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  AcceptInvitationRequestSchema,
  AcceptInvitationSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { AcceptInvitationRequest } from "@oko-wallet/oko-types/ct_dashboard";
import type { Request, Response } from "express";

import { acceptTeamInvitation } from "@oko-wallet-ctd-api/api/team_invitation";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/team/accept_invitation",
  tags: ["Customer Dashboard - Team"],
  summary: "Accept team invitation",
  description:
    "Accepts a team invitation, creates the user account, and returns a JWT. No authentication required.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: AcceptInvitationRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Invitation accepted, account created",
      content: {
        "application/json": {
          schema: AcceptInvitationSuccessResponseSchema,
        },
      },
    },
    404: {
      description: "Invitation not found",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
    409: {
      description: "Email already belongs to a team",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
    410: {
      description: "Invitation expired",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
  },
});

export async function acceptInvitation(
  req: Request<unknown, unknown, AcceptInvitationRequest>,
  res: Response<OkoApiResponse<unknown>>,
) {
  const state = req.app.locals;

  const result = await acceptTeamInvitation(state.db, req.body);

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
