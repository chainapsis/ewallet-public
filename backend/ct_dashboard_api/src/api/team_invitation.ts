import { randomUUID } from "node:crypto";
import { hashPassword } from "@oko-wallet/crypto-js";
import {
  getCTDUserWithCustomerByEmail,
  insertCustomerDashboardUser,
} from "@oko-wallet/oko-pg-interface/customer_dashboard_users";
import {
  getTeamInvitationByToken,
  updatePendingInvitationStatus,
} from "@oko-wallet/oko-pg-interface/customer_team_invitations";
import type { OkoApiResponse } from "@oko-wallet/oko-types/api_response";
import type {
  AcceptInvitationRequest,
  ValidateInvitationRequest,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Pool } from "pg";

import {
  CHANGED_PASSWORD_MAX_LENGTH,
  CHANGED_PASSWORD_MIN_LENGTH,
  PASSWORD_CONTAINS_NUMBER_REGEX,
} from "@oko-wallet-ctd-api/constants";

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
