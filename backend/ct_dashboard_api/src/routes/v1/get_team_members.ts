import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  GetTeamMembersRequestSchema,
  GetTeamMembersSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import { getTeamMembersByCustomerId } from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import { getPendingInvitationsByCustomerId } from "@oko-wallet/oko-pg-interface/customer_team_invitations";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { GetTeamMembersRequest } from "@oko-wallet/oko-types/ct_dashboard";
import type { Response } from "express";

import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/team/get_members",
  tags: ["Customer Dashboard - Team"],
  summary: "Get team members",
  description:
    "Retrieves team members and pending invitations for the customer",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: GetTeamMembersRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Team members retrieved successfully",
      content: {
        "application/json": {
          schema: GetTeamMembersSuccessResponseSchema,
        },
      },
    },
    401: {
      description: "User not authenticated",
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

export async function getTeamMembers(
  req: CustomerAuthenticatedRequest<GetTeamMembersRequest>,
  res: Response<OkoApiResponse<unknown>>,
) {
  try {
    const state = req.app.locals;
    const userId = res.locals.user_id;
    const { customer_id: customerId, label: teamName } = res.locals.team;

    const { limit = 20, offset = 0, search, sort_by, sort_order } = req.body;

    const [membersRes, invitationsRes] = await Promise.all([
      getTeamMembersByCustomerId(state.db, customerId, {
        limit,
        offset,
        search,
        sortBy: sort_by,
        sortOrder: sort_order,
      }),
      getPendingInvitationsByCustomerId(state.db, customerId),
    ]);

    if (!membersRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: membersRes.err,
      });
      return;
    }

    if (!invitationsRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: invitationsRes.err,
      });
      return;
    }

    const members = membersRes.data.members.map((m) => ({
      user_id: m.user_id,
      email: m.email,
      role: m.role,
      is_current_user: m.user_id === userId,
    }));

    const pendingInvitations = invitationsRes.data.map((inv) => ({
      invitation_id: inv.invitation_id,
      email: inv.email,
      role: inv.role,
      status: inv.status as "PENDING",
      last_sent_at: inv.last_sent_at,
    }));

    res.status(200).json({
      success: true,
      data: {
        members,
        pending_invitations: pendingInvitations,
        total: membersRes.data.total,
        team_name: teamName,
      },
    });
    return;
  } catch (_error) {
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
    return;
  }
}
