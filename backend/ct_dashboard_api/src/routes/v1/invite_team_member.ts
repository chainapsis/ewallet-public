import { randomBytes } from "node:crypto";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  InviteTeamMemberRequestSchema,
  InviteTeamMemberSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import { getCTDUserWithCustomerByEmail } from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import {
  getPendingInvitationByEmail,
  insertTeamInvitation,
} from "@oko-wallet/oko-pg-interface/customer_team_invitations";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { InviteTeamMemberRequest } from "@oko-wallet/oko-types/ct_dashboard";
import type { Response } from "express";

import {
  EMAIL_REGEX,
  INVITATION_EXPIRY_DAYS,
} from "@oko-wallet-ctd-api/constants";
import { sendTeamInvitationEmail } from "@oko-wallet-ctd-api/email/team_invitation";
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
  try {
    const state = req.app.locals;
    const userId = res.locals.user_id;
    const { customer_id: customerId, label: teamName } = res.locals.team;
    const { email, role } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      res.status(ErrorCodeMap.INVALID_EMAIL_FORMAT).json({
        success: false,
        code: "INVALID_EMAIL_FORMAT",
        msg: "Invalid email format",
      });
      return;
    }

    // Check if email is already associated with any team
    const otherTeamRes = await getCTDUserWithCustomerByEmail(state.db, email);
    if (!otherTeamRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: otherTeamRes.err,
      });
      return;
    }
    if (otherTeamRes.data !== null) {
      res.status(ErrorCodeMap.DUPLICATE_TEAM_MEMBER).json({
        success: false,
        code: "DUPLICATE_TEAM_MEMBER",
        msg: "This email is already associated with another team",
      });
      return;
    }

    // Check if there's already a pending invitation
    const pendingRes = await getPendingInvitationByEmail(
      state.db,
      customerId,
      email,
    );
    if (!pendingRes.success) {
      res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        msg: pendingRes.err,
      });
      return;
    }
    if (pendingRes.data !== null) {
      res.status(ErrorCodeMap.INVITATION_ALREADY_PENDING).json({
        success: false,
        code: "INVITATION_ALREADY_PENDING",
        msg: "An invitation is already pending for this email",
      });
      return;
    }

    // Insert invitation + send email in transaction
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const client = await state.db.connect();
    try {
      await client.query("BEGIN");

      const invitationRes = await insertTeamInvitation(client, {
        customer_id: customerId,
        email,
        role,
        token,
        inviter_user_id: userId,
        expires_at: expiresAt,
      });

      if (!invitationRes.success) {
        throw new Error(invitationRes.err);
      }

      const inviteUrl = `${state.dapp_dashboard_url}/team/invite?token=${token}`;

      const emailRes = await sendTeamInvitationEmail(
        email,
        inviteUrl,
        teamName,
        state.from_email,
        {
          smtp_host: state.smtp_host,
          smtp_port: state.smtp_port,
          smtp_user: state.smtp_user,
          smtp_pass: state.smtp_pass,
        },
      );

      if (!emailRes.success) {
        throw new Error("Failed to send invitation email");
      }

      await client.query("COMMIT");

      res.status(200).json({
        success: true,
        data: {
          invitation_id: invitationRes.data.invitation_id,
          email: invitationRes.data.email,
          role: invitationRes.data.role,
        },
      });
      return;
    } catch (txError) {
      await client.query("ROLLBACK");
      const msg =
        txError instanceof Error ? txError.message : "Internal server error";
      const code = msg.includes("send")
        ? "FAILED_TO_SEND_EMAIL"
        : "UNKNOWN_ERROR";
      res.status(500).json({
        success: false,
        code,
        msg,
      });
      return;
    } finally {
      client.release();
    }
  } catch (_error) {
    res.status(500).json({
      success: false,
      code: "UNKNOWN_ERROR",
      msg: "Internal server error",
    });
    return;
  }
}
