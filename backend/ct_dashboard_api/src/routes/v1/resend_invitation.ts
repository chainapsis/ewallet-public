import { randomBytes } from "node:crypto";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  CustomerAuthHeaderSchema,
  ResendInvitationRequestSchema,
  ResendInvitationSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import {
  getTeamInvitationById,
  refreshTeamInvitation,
} from "@oko-wallet/oko-pg-interface/customer_team_invitations";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { ResendInvitationRequest } from "@oko-wallet/oko-types/ct_dashboard";
import type { Response } from "express";

import {
  INVITATION_EXPIRY_DAYS,
  RESEND_COOLDOWN_MS,
} from "@oko-wallet-ctd-api/constants";
import { sendTeamInvitationEmail } from "@oko-wallet-ctd-api/email/team_invitation";
import type { CustomerAuthenticatedRequest } from "@oko-wallet-ctd-api/middleware/auth";

registry.registerPath({
  method: "post",
  path: "/customer_dashboard/v1/customer/team/resend_invitation",
  tags: ["Customer Dashboard - Team"],
  summary: "Resend team invitation",
  description: "Resends an invitation email (5-minute cooldown)",
  security: [{ customerAuth: [] }],
  request: {
    headers: CustomerAuthHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: ResendInvitationRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Invitation resent successfully",
      content: {
        "application/json": {
          schema: ResendInvitationSuccessResponseSchema,
        },
      },
    },
    404: {
      description: "Invitation not found",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
    429: {
      description: "Resend cooldown not elapsed",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
  },
});

export async function resendInvitation(
  req: CustomerAuthenticatedRequest<ResendInvitationRequest>,
  res: Response<OkoApiResponse<unknown>>,
) {
  try {
    const state = req.app.locals;
    const { customer_id: customerId, label: teamName } = res.locals.team;
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

    const invitation = invitationRes.data;

    if (invitation.status !== "PENDING") {
      res.status(ErrorCodeMap.INVITATION_NOT_PENDING).json({
        success: false,
        code: "INVITATION_NOT_PENDING",
        msg: "Invitation is no longer pending",
      });
      return;
    }

    // Check 5-minute cooldown
    if (invitation.last_sent_at) {
      const lastSent = new Date(invitation.last_sent_at).getTime();
      const elapsed = Date.now() - lastSent;
      if (elapsed < RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil(
          (RESEND_COOLDOWN_MS - elapsed) / 1000,
        );
        res.status(ErrorCodeMap.RESEND_COOLDOWN).json({
          success: false,
          code: "RESEND_COOLDOWN",
          msg: `Please wait ${remainingSeconds} seconds before resending`,
        });
        return;
      }
    }

    // Refresh token + send email in transaction
    const newToken = randomBytes(32).toString("hex");
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const client = await state.db.connect();
    try {
      await client.query("BEGIN");

      const refreshRes = await refreshTeamInvitation(
        client,
        invitation_id,
        newToken,
        newExpiresAt,
      );

      if (!refreshRes.success) {
        throw new Error(refreshRes.err);
      }

      const inviteUrl = `${state.dapp_dashboard_url}/team/invite?token=${newToken}`;

      const emailRes = await sendTeamInvitationEmail(
        invitation.email,
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
