import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import { getCTDUserWithCustomerByEmail } from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import {
  getTeamInvitationByToken,
  updatePendingInvitationStatus,
} from "@oko-wallet/oko-pg-interface/customer_team_invitations";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { ValidateInvitationRequest } from "@oko-wallet/oko-types/ct_dashboard";
import type { Request, Response } from "express";
import { z } from "zod";

const ValidateInvitationRequestSchema = registry.register(
  "ValidateInvitationRequest",
  z.object({
    token: z.string().openapi({
      description: "Invitation token from email link",
    }),
  }),
);

const ValidateInvitationSuccessResponseSchema = registry.register(
  "ValidateInvitationSuccessResponse",
  z.object({
    success: z.literal(true),
    data: z.object({
      email: z.string(),
      role: z.string(),
      team_name: z.string(),
    }),
  }),
);

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/team/validate_invitation",
  tags: ["Customer Dashboard - Team"],
  summary: "Validate invitation token",
  description:
    "Validates an invitation token without accepting it. Used to show the invite accept page.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: ValidateInvitationRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Invitation is valid",
      content: {
        "application/json": {
          schema: ValidateInvitationSuccessResponseSchema,
        },
      },
    },
    404: {
      description: "Invitation not found",
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

export async function validateInvitation(
  req: Request<unknown, unknown, ValidateInvitationRequest>,
  res: Response<OkoApiResponse<unknown>>,
) {
  try {
    const state = req.app.locals;
    const { token } = req.body;

    const invitationRes = await getTeamInvitationByToken(state.db, token);

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

    const invitation = invitationRes.data;

    if (invitation.status !== "PENDING") {
      const code =
        invitation.status === "ACCEPTED"
          ? "INVITATION_ALREADY_ACCEPTED"
          : "INVITATION_NOT_PENDING";
      res.status(ErrorCodeMap[code]).json({
        success: false,
        code,
        msg: `Invitation is ${invitation.status.toLowerCase()}`,
      });
      return;
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await updatePendingInvitationStatus(
        state.db,
        invitation.invitation_id,
        "EXPIRED",
      );
      res.status(ErrorCodeMap.INVITATION_EXPIRED).json({
        success: false,
        code: "INVITATION_EXPIRED",
        msg: "Invitation has expired",
      });
      return;
    }

    // Check if email already belongs to a team
    const existingUserRes = await getCTDUserWithCustomerByEmail(
      state.db,
      invitation.email,
    );
    if (existingUserRes.success && existingUserRes.data !== null) {
      res.status(ErrorCodeMap.DUPLICATE_TEAM_MEMBER).json({
        success: false,
        code: "DUPLICATE_TEAM_MEMBER",
        msg: "This email is already associated with a team",
      });
      return;
    }

    // Verify customer is still active
    const customerQuery = `
      SELECT label FROM customers
      WHERE customer_id = $1 AND status = 'ACTIVE'
    `;
    const customerResult = await state.db.query(customerQuery, [
      invitation.customer_id,
    ]);
    if (customerResult.rows.length === 0) {
      res.status(ErrorCodeMap.INVITATION_NOT_FOUND).json({
        success: false,
        code: "INVITATION_NOT_FOUND",
        msg: "The team no longer exists",
      });
      return;
    }
    const teamName = customerResult.rows[0].label;

    res.status(200).json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
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
