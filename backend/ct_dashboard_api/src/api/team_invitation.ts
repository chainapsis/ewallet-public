import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "@oko-wallet/crypto-js";
import {
  getCTDUserWithCustomerByEmail,
  insertCustomerDashboardUser,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import {
  getPendingInvitationByEmail,
  getTeamInvitationById,
  getTeamInvitationByToken,
  insertTeamInvitation,
  refreshTeamInvitation,
  updatePendingInvitationStatus,
} from "@oko-wallet/oko-pg-interface/customer_team_invitations";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  AcceptInvitationRequest,
  InviteTeamMemberRequest,
  ResendInvitationRequest,
  ValidateInvitationRequest,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Pool } from "pg";

import {
  CHANGED_PASSWORD_MAX_LENGTH,
  CHANGED_PASSWORD_MIN_LENGTH,
  EMAIL_REGEX,
  INVITATION_EXPIRY_DAYS,
  PASSWORD_CONTAINS_NUMBER_REGEX,
  RESEND_COOLDOWN_MS,
} from "@oko-wallet-ctd-api/constants";
import { sendTeamInvitationEmail } from "@oko-wallet-ctd-api/email/team_invitation";

interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
}

interface InviteEmailConfig {
  dapp_dashboard_url: string;
  from_email: string;
  smtp_config: SmtpConfig;
}

export async function acceptTeamInvitation(
  db: Pool,
  body: AcceptInvitationRequest,
): Promise<OkoApiResponse<{ email: string; customer_id: string }>> {
  try {
    const { token, password } = body;

    // Validate password
    if (
      !password ||
      password.length < CHANGED_PASSWORD_MIN_LENGTH ||
      password.length > CHANGED_PASSWORD_MAX_LENGTH ||
      !PASSWORD_CONTAINS_NUMBER_REGEX.test(password)
    ) {
      return {
        success: false,
        code: "INVALID_REQUEST",
        msg: `Password must be ${CHANGED_PASSWORD_MIN_LENGTH}-${CHANGED_PASSWORD_MAX_LENGTH} characters and include at least one number`,
      };
    }

    // Validate token
    const invitationRes = await getTeamInvitationByToken(db, token);

    if (!invitationRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: invitationRes.err,
      };
    }

    if (invitationRes.data === null) {
      return {
        success: false,
        code: "INVITATION_NOT_FOUND",
        msg: "Invitation not found",
      };
    }

    const invitation = invitationRes.data;

    if (invitation.status !== "PENDING") {
      const code =
        invitation.status === "ACCEPTED"
          ? "INVITATION_ALREADY_ACCEPTED"
          : "INVITATION_NOT_PENDING";
      return {
        success: false,
        code,
        msg: `Invitation is ${invitation.status.toLowerCase()}`,
      };
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      await updatePendingInvitationStatus(
        db,
        invitation.invitation_id,
        "EXPIRED",
      );
      return {
        success: false,
        code: "INVITATION_EXPIRED",
        msg: "Invitation has expired",
      };
    }

    // Verify customer is still active
    const customerCheck = await db.query(
      "SELECT 1 FROM customers WHERE customer_id = $1 AND status = 'ACTIVE'",
      [invitation.customer_id],
    );
    if (customerCheck.rows.length === 0) {
      return {
        success: false,
        code: "INVITATION_NOT_FOUND",
        msg: "The team no longer exists",
      };
    }

    // Check if email is already associated with any team
    const existingUserRes = await getCTDUserWithCustomerByEmail(
      db,
      invitation.email,
    );

    if (!existingUserRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: existingUserRes.err,
      };
    }

    if (existingUserRes.data !== null) {
      return {
        success: false,
        code: "DUPLICATE_TEAM_MEMBER",
        msg: "This email is already associated with a team",
      };
    }

    // Create user account + accept invitation in transaction
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const insertRes = await insertCustomerDashboardUser(client, {
        user_id: userId,
        customer_id: invitation.customer_id,
        email: invitation.email,
        role: invitation.role,
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
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: "Failed to accept invitation",
      };
    } finally {
      client.release();
    }

    return {
      success: true,
      data: {
        email: invitation.email,
        customer_id: invitation.customer_id,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `acceptTeamInvitation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function validateTeamInvitation(
  db: Pool,
  body: ValidateInvitationRequest,
): Promise<OkoApiResponse<{ email: string; role: string; team_name: string }>> {
  try {
    const { token } = body;

    const invitationRes = await getTeamInvitationByToken(db, token);

    if (!invitationRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: invitationRes.err,
      };
    }

    if (invitationRes.data === null) {
      return {
        success: false,
        code: "INVITATION_NOT_FOUND",
        msg: "Invitation not found",
      };
    }

    const invitation = invitationRes.data;

    if (invitation.status !== "PENDING") {
      const code =
        invitation.status === "ACCEPTED"
          ? "INVITATION_ALREADY_ACCEPTED"
          : "INVITATION_NOT_PENDING";
      return {
        success: false,
        code,
        msg: `Invitation is ${invitation.status.toLowerCase()}`,
      };
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await updatePendingInvitationStatus(
        db,
        invitation.invitation_id,
        "EXPIRED",
      );
      return {
        success: false,
        code: "INVITATION_EXPIRED",
        msg: "Invitation has expired",
      };
    }

    // Check if email already belongs to a team
    const existingUserRes = await getCTDUserWithCustomerByEmail(
      db,
      invitation.email,
    );
    if (existingUserRes.success && existingUserRes.data !== null) {
      return {
        success: false,
        code: "DUPLICATE_TEAM_MEMBER",
        msg: "This email is already associated with a team",
      };
    }

    // Verify customer is still active
    const customerResult = await db.query(
      "SELECT label FROM customers WHERE customer_id = $1 AND status = 'ACTIVE'",
      [invitation.customer_id],
    );
    if (customerResult.rows.length === 0) {
      return {
        success: false,
        code: "INVITATION_NOT_FOUND",
        msg: "The team no longer exists",
      };
    }
    const teamName = customerResult.rows[0].label;

    return {
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        team_name: teamName,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `validateTeamInvitation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function inviteTeamMemberRequest(
  db: Pool,
  body: InviteTeamMemberRequest,
  teamContext: { customer_id: string; label: string; user_id: string },
  config: InviteEmailConfig,
): Promise<
  OkoApiResponse<{
    invitation_id: string;
    email: string;
    role: string;
  }>
> {
  try {
    const { email, role } = body;
    const {
      customer_id: customerId,
      label: teamName,
      user_id: userId,
    } = teamContext;

    if (!email || !EMAIL_REGEX.test(email)) {
      return {
        success: false,
        code: "INVALID_EMAIL_FORMAT",
        msg: "Invalid email format",
      };
    }

    // Check if email is already associated with any team
    const otherTeamRes = await getCTDUserWithCustomerByEmail(db, email);
    if (!otherTeamRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: otherTeamRes.err,
      };
    }
    if (otherTeamRes.data !== null) {
      return {
        success: false,
        code: "DUPLICATE_TEAM_MEMBER",
        msg: "The user already exists",
      };
    }

    // Check if there's already a pending invitation
    const pendingRes = await getPendingInvitationByEmail(db, customerId, email);
    if (!pendingRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: pendingRes.err,
      };
    }
    if (pendingRes.data !== null) {
      return {
        success: false,
        code: "INVITATION_ALREADY_PENDING",
        msg: "An invitation is already pending for this email",
      };
    }

    // Insert invitation + send email in transaction
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const client = await db.connect();
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

      const inviteUrl = `${config.dapp_dashboard_url}/team/invite?token=${token}`;

      const emailRes = await sendTeamInvitationEmail(
        email,
        inviteUrl,
        teamName,
        config.from_email,
        config.smtp_config,
      );

      if (!emailRes.success) {
        throw new Error("Failed to send invitation email");
      }

      await client.query("COMMIT");

      return {
        success: true,
        data: {
          invitation_id: invitationRes.data.invitation_id,
          email: invitationRes.data.email,
          role: invitationRes.data.role,
        },
      };
    } catch (txError) {
      await client.query("ROLLBACK");
      const msg =
        txError instanceof Error ? txError.message : "Internal server error";
      const code = msg.includes("send")
        ? "FAILED_TO_SEND_EMAIL"
        : "UNKNOWN_ERROR";
      return {
        success: false,
        code,
        msg,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `inviteTeamMemberRequest error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function resendInvitationRequest(
  db: Pool,
  body: ResendInvitationRequest,
  teamContext: { customer_id: string; label: string },
  config: InviteEmailConfig,
): Promise<OkoApiResponse<{ invitation_id: string }>> {
  try {
    const { customer_id: customerId, label: teamName } = teamContext;
    const { invitation_id } = body;

    const invitationRes = await getTeamInvitationById(
      db,
      invitation_id,
      customerId,
    );

    if (!invitationRes.success) {
      return {
        success: false,
        code: "UNKNOWN_ERROR",
        msg: invitationRes.err,
      };
    }

    if (invitationRes.data === null) {
      return {
        success: false,
        code: "INVITATION_NOT_FOUND",
        msg: "Invitation not found",
      };
    }

    const invitation = invitationRes.data;

    if (invitation.status !== "PENDING") {
      return {
        success: false,
        code: "INVITATION_NOT_PENDING",
        msg: "Invitation is no longer pending",
      };
    }

    // Check 5-minute cooldown
    if (invitation.last_sent_at) {
      const lastSent = new Date(invitation.last_sent_at).getTime();
      const elapsed = Date.now() - lastSent;
      if (elapsed < RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil(
          (RESEND_COOLDOWN_MS - elapsed) / 1000,
        );
        return {
          success: false,
          code: "RESEND_COOLDOWN",
          msg: `Please wait ${remainingSeconds} seconds before resending`,
        };
      }
    }

    // Refresh token + send email in transaction
    const newToken = randomBytes(32).toString("hex");
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const client = await db.connect();
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

      const inviteUrl = `${config.dapp_dashboard_url}/team/invite?token=${newToken}`;

      const emailRes = await sendTeamInvitationEmail(
        invitation.email,
        inviteUrl,
        teamName,
        config.from_email,
        config.smtp_config,
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
      return {
        success: false,
        code,
        msg,
      };
    } finally {
      client.release();
    }

    return {
      success: true,
      data: { invitation_id },
    };
  } catch (error) {
    return {
      success: false,
      code: "UNKNOWN_ERROR",
      msg: `resendInvitationRequest error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
