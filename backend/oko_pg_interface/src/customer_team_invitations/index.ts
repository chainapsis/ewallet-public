import type {
  CustomerDashboardUserRole,
  TeamInvitationStatus,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";

export interface CustomerTeamInvitation {
  invitation_id: string;
  customer_id: string;
  email: string;
  role: CustomerDashboardUserRole;
  token: string;
  status: TeamInvitationStatus;
  inviter_user_id: string;
  last_sent_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export async function insertTeamInvitation(
  db: Pool | PoolClient,
  params: {
    customer_id: string;
    email: string;
    role: CustomerDashboardUserRole;
    token: string;
    inviter_user_id: string;
    expires_at: Date;
  },
): Promise<Result<CustomerTeamInvitation, string>> {
  const query = `
    INSERT INTO customer_team_invitations (
      customer_id, email, role, token,
      inviter_user_id, last_sent_at, expires_at
    )
    VALUES ($1, $2, $3, $4, $5, now(), $6)
    RETURNING *
  `;

  try {
    const result = await db.query(query, [
      params.customer_id,
      params.email,
      params.role,
      params.token,
      params.inviter_user_id,
      params.expires_at,
    ]);
    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Failed to create invitation" };
    }
    return { success: true, data: row };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getTeamInvitationByToken(
  db: Pool | PoolClient,
  token: string,
): Promise<Result<CustomerTeamInvitation | null, string>> {
  const query = `
    SELECT * FROM customer_team_invitations
    WHERE token = $1
  `;

  try {
    const result = await db.query(query, [token]);
    return { success: true, data: result.rows[0] ?? null };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getTeamInvitationById(
  db: Pool | PoolClient,
  invitationId: string,
  customerId: string,
): Promise<Result<CustomerTeamInvitation | null, string>> {
  const query = `
    SELECT * FROM customer_team_invitations
    WHERE invitation_id = $1 AND customer_id = $2
  `;

  try {
    const result = await db.query(query, [invitationId, customerId]);
    return { success: true, data: result.rows[0] ?? null };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function updatePendingInvitationStatus(
  db: Pool | PoolClient,
  invitationId: string,
  status: TeamInvitationStatus,
): Promise<Result<CustomerTeamInvitation, string>> {
  const query = `
    UPDATE customer_team_invitations
    SET status = $1, updated_at = now()
    WHERE invitation_id = $2 AND status = 'PENDING'
    RETURNING *
  `;

  try {
    const result = await db.query(query, [status, invitationId]);
    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Invitation not found" };
    }
    return { success: true, data: row };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function refreshTeamInvitation(
  db: Pool | PoolClient,
  invitationId: string,
  newToken: string,
  newExpiresAt: Date,
): Promise<Result<CustomerTeamInvitation, string>> {
  const query = `
    UPDATE customer_team_invitations
    SET token = $1, expires_at = $2, last_sent_at = now(), updated_at = now()
    WHERE invitation_id = $3 AND status = 'PENDING'
    RETURNING *
  `;

  try {
    const result = await db.query(query, [
      newToken,
      newExpiresAt,
      invitationId,
    ]);
    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Invitation not found" };
    }
    return { success: true, data: row };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getPendingInvitationsByCustomerId(
  db: Pool | PoolClient,
  customerId: string,
): Promise<Result<CustomerTeamInvitation[], string>> {
  const query = `
    SELECT * FROM customer_team_invitations
    WHERE customer_id = $1 AND status = 'PENDING'
    ORDER BY created_at DESC
  `;

  try {
    const result = await db.query(query, [customerId]);
    return { success: true, data: result.rows };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getPendingInvitationByEmail(
  db: Pool | PoolClient,
  customerId: string,
  email: string,
): Promise<Result<CustomerTeamInvitation | null, string>> {
  const query = `
    SELECT * FROM customer_team_invitations
    WHERE customer_id = $1 AND email = $2 AND status = 'PENDING'
      AND expires_at > NOW()
  `;

  try {
    const result = await db.query(query, [customerId, email]);
    return { success: true, data: result.rows[0] ?? null };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}
