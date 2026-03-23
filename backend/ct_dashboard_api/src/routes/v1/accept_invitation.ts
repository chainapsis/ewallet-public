import { randomUUID } from "node:crypto";
import { hashPassword } from "@oko-wallet/crypto-js";
import { ErrorCodeMap } from "@oko-wallet/oko-api-error-codes";
import { registry } from "@oko-wallet/oko-api-openapi";
import { ErrorResponseSchema } from "@oko-wallet/oko-api-openapi/common";
import {
  AcceptInvitationRequestSchema,
  AcceptInvitationSuccessResponseSchema,
} from "@oko-wallet/oko-api-openapi/ct_dashboard";
import {
  getCTDUserWithCustomerByEmail,
  insertCustomerDashboardUser,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import {
  getTeamInvitationByToken,
  updatePendingInvitationStatus,
} from "@oko-wallet/oko-pg-interface/customer_team_invitations";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type { CustomerDashboardUserRole } from "@oko-wallet/oko-types/ct_dashboard";
import type { Request, Response } from "express";

import { generateCustomerToken } from "@oko-wallet-ctd-api/auth";

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
  req: Request,
  res: Response<OkoApiResponse<unknown>>,
) {
  try {
    const state = req.app.locals;
    const { token, password } = req.body;

    // Validate password
    if (
      !password ||
      password.length < 8 ||
      password.length > 20 ||
      !/\d/.test(password)
    ) {
      res.status(ErrorCodeMap.INVALID_REQUEST).json({
        success: false,
        code: "INVALID_REQUEST",
        msg: "Password must be 8-20 characters and include at least one number",
      });
      return;
    }

    // Validate token
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

    // Verify customer is still active
    const customerCheck = await state.db.query(
      "SELECT 1 FROM customers WHERE customer_id = $1 AND status = 'ACTIVE'",
      [invitation.customer_id],
    );
    if (customerCheck.rows.length === 0) {
      res.status(ErrorCodeMap.INVITATION_NOT_FOUND).json({
        success: false,
        code: "INVITATION_NOT_FOUND",
        msg: "The team no longer exists",
      });
      return;
    }

    // Check if email is already associated with any team
    const existingUserRes = await getCTDUserWithCustomerByEmail(
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

    if (existingUserRes.data !== null) {
      res.status(ErrorCodeMap.DUPLICATE_TEAM_MEMBER).json({
        success: false,
        code: "DUPLICATE_TEAM_MEMBER",
        msg: "This email is already associated with a team",
      });
      return;
    }

    // Create user account + accept invitation in transaction
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);

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
        password_hash: passwordHash,
      });

      if (!insertRes.success) {
        throw new Error(insertRes.err);
      }

      const statusRes = await updatePendingInvitationStatus(
        client,
        invitation.invitation_id,
        "ACCEPTED",
      );

      if (!statusRes.success) {
        throw new Error(statusRes.err);
      }

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

    // Generate JWT for the new user
    const tokenRes = generateCustomerToken({
      user_id: userId,
      jwt_config: {
        secret: state.jwt_secret,
        expires_in: state.jwt_expires_in,
      },
    });

    if (!tokenRes.success) {
      res.status(500).json({
        success: false,
        code: "FAILED_TO_GENERATE_TOKEN",
        msg: tokenRes.err,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        token: tokenRes.data.token,
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
