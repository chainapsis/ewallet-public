import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  RemoveMemberRequestSchema,
  RemoveMemberSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import {
  getCTDUserByUserIdAndCustomerId,
  softDeleteCTDUser,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { RemoveMemberRequest } from "@oko-wallet/oko-types/ct_dashboard";
import type { Response } from "express";

import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/team/remove_member",
  tags: ["Customer Dashboard - Team"],
  summary: "Remove team member",
  description: "Removes a member from the team (admin only)",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: RemoveMemberRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Member removed successfully",
      content: {
        "application/json": {
          schema: RemoveMemberSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Cannot remove self",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
    404: {
      description: "Team member not found",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
  },
});

export async function removeTeamMember(
  req: CustomerAuthenticatedRequest<RemoveMemberRequest>,
  res: Response<OkoApiResponse<unknown>>,
) {
  try {
    const state = req.app.locals;
    const currentUserId = res.locals.user_id;
    const { customer_id: customerId } = res.locals.team;
    const { user_id } = req.body;

    if (user_id === currentUserId) {
      res.status(ErrorCodeMap.CANNOT_REMOVE_SELF).json({
        success: false,
        code: "CANNOT_REMOVE_SELF",
        msg: "Cannot remove yourself. Use leave team instead.",
      });
      return;
    }

    const memberRes = await getCTDUserByUserIdAndCustomerId(
      state.db,
      user_id,
      customerId,
    );

    if (!memberRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: memberRes.err,
      });
      return;
    }

    if (memberRes.data === null) {
      res.status(ErrorCodeMap.TEAM_MEMBER_NOT_FOUND).json({
        success: false,
        code: "TEAM_MEMBER_NOT_FOUND",
        msg: "Team member not found",
      });
      return;
    }

    const deleteRes = await softDeleteCTDUser(state.db, user_id, customerId);

    if (!deleteRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: deleteRes.err,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user_id },
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
