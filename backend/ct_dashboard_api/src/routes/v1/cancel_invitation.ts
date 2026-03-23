import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CancelInvitationRequestSchema,
  CancelInvitationSuccessResponseSchema,
  CustomerAuthHeaderSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import {
  getTeamInvitationById,
  updatePendingInvitationStatus,
} from "@oko-wallet/oko-pg-interface/customer_team_invitations";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { Response } from "express";

import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/team/cancel_invitation",
  tags: ["Customer Dashboard - Team"],
  summary: "Cancel team invitation",
  description: "Cancels a pending team invitation",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CancelInvitationRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Invitation cancelled successfully",
      content: {
        "application/json": {
          schema: CancelInvitationSuccessResponseSchema,
        },
      },
    },
    404: {
      description: "Invitation not found",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
  },
});

export async function cancelInvitation(
  req: CustomerAuthenticatedRequest,
  res: Response<OkoApiResponse<unknown>>,
) {
  try {
    const state = req.app.locals;
    const { customer_id: customerId } = res.locals.team;
    const { invitation_id } = req.body;

    const invitationRes = await getTeamInvitationById(
      state.db,
      invitation_id,
      customerId,
    );

    if (!invitationRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: invitationRes.err,
      });
      return;
    }

    if (invitationRes.data === null) {
      res.status(ErrorCodeMap.INVITATION_NOT_FOUND).json({
        success: false,
        code: "INVITATION_NOT_FOUND",
        msg: "Invitation not found",
      });
      return;
    }

    if (invitationRes.data.status !== "PENDING") {
      res.status(ErrorCodeMap.INVITATION_NOT_PENDING).json({
        success: false,
        code: "INVITATION_NOT_PENDING",
        msg: "Invitation is no longer pending",
      });
      return;
    }

    await updatePendingInvitationStatus(state.db, invitation_id, "CANCELLED");

    res.status(200).json({
      success: true,
      data: { invitation_id },
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
