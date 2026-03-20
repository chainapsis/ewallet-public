import { randomUUID } from "node:crypto";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  AcceptInvitationRequestSchema,
  AcceptInvitationSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import {
  getCTDUserWithCustomerAndPasswordHashByEmail,
  insertCustomerDashboardUser,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import {
  getTeamInvitationByToken,
  updateTeamInvitationStatus,
} from "@oko-wallet/oko-pg-interface/customer_team_invitations";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { CustomerDashboardUserRole } from "@oko-wallet/oko-types/ct_dashboard";
import type { Request, Response } from "express";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/team/accept_invitation",
  tags: ["Customer Dashboard - Team"],
  summary: "Accept team invitation",
  description:
    "Accepts a team invitation using the token from the email link. No authentication required.",
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
      description: "Invitation accepted or signup required",
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
    410: {
      description: "Invitation expired",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
  },
});

export async function acceptInvitation(
  req: Request,
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

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      await updateTeamInvitationStatus(
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

    // Check if user already exists (need password_hash for reuse)
    const existingUserRes = await getCTDUserWithCustomerAndPasswordHashByEmail(
      state.db,
      invitation.email,
    );

    if (!existingUserRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: existingUserRes.err,
      });
      return;
    }

    if (existingUserRes.data === null) {
      // User doesn't exist yet — frontend should redirect to signup
      res.status(200).json({
        success: true,
        data: {
          action: "signup_required",
          email: invitation.email,
          customer_id: invitation.customer_id,
        },
      });
      return;
    }

    // User exists — add to team (transactional)
    const userId = randomUUID();
    const client = await state.db.connect();
    try {
      await client.query("BEGIN");

      const insertRes = await insertCustomerDashboardUser(client, {
        user_id: userId,
        customer_id: invitation.customer_id,
        email: invitation.email,
        role: invitation.role as CustomerDashboardUserRole,
        status: "ACTIVE",
        is_email_verified: true,
        password_hash: existingUserRes.data.user.password_hash,
      });

      if (!insertRes.success) {
        await client.query("ROLLBACK");
        res.status(500).json({
          success: false,
          code: "UNKNOWN_ERROR",
          msg: insertRes.err,
        });
        return;
      }

      await updateTeamInvitationStatus(
        client,
        invitation.invitation_id,
        "ACCEPTED",
      );

      await client.query("COMMIT");
    } catch (_txError) {
      await client.query("ROLLBACK");
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to accept invitation",
      });
      return;
    } finally {
      client.release();
    }

    res.status(200).json({
      success: true,
      data: {
        action: "joined",
        email: invitation.email,
        customer_id: invitation.customer_id,
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
