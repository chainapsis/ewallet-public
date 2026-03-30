import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  InviteTeamMemberRequestSchema,
  InviteTeamMemberSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { InviteTeamMemberRequest } from "@oko-wallet/oko-types/ct_dashboard";
import type { Response } from "express";

import { inviteTeamMemberRequest } from "@oko-wallet-ctd-api/api/team_invitation";
import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/team/invite_member",
  tags: ["Customer Dashboard - Team"],
  summary: "Invite a team member",
  description: "Sends an invitation email to join the team",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: InviteTeamMemberRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Invitation sent successfully",
      content: {
        "application/json": {
          schema: InviteTeamMemberSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
    409: {
      description: "Duplicate member or pending invitation",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
  },
});

export async function inviteTeamMember(
  req: CustomerAuthenticatedRequest<InviteTeamMemberRequest>,
  res: Response<OkoApiResponse<unknown>>,
) {
  const state = req.app.locals;
  const userId = res.locals.user_id;
  const { customer_id, label } = res.locals.team;

  const result = await inviteTeamMemberRequest(
    state.db,
    req.body,
    { customer_id, label, user_id: userId },
    {
      dapp_dashboard_url: state.dapp_dashboard_url,
      from_email: state.from_email,
      smtp_config: {
        smtp_host: state.smtp_host,
        smtp_port: state.smtp_port,
        smtp_user: state.smtp_user,
        smtp_pass: state.smtp_pass,
      },
    },
  );

  if (!result.success) {
    res.status(ErrorCodeMap[result.code] ?? 500).json(result);
    return;
  }

  res.status(200).json(result);
}
