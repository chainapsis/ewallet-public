import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";

export interface CustomerAdminTransfer {
  transfer_id: string;
  customer_id: string;
  from_user_id: string;
  to_user_id: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export async function insertAdminTransfer(
  db: Pool | PoolClient,
  params: {
    customer_id: string;
    from_user_id: string;
    to_user_id: string;
    token: string;
    expires_at: Date;
  },
): Promise<Result<CustomerAdminTransfer, string>> {
  const query = `
    INSERT INTO customer_admin_transfers (
      customer_id, from_user_id, to_user_id, token, expires_at
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  try {
    const result = await db.query(query, [
      params.customer_id,
      params.from_user_id,
      params.to_user_id,
      params.token,
      params.expires_at,
    ]);
    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Failed to create admin transfer" };
    }
    return { success: true, data: row };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getAdminTransferByToken(
  db: Pool | PoolClient,
  token: string,
): Promise<Result<CustomerAdminTransfer | null, string>> {
  const query = `
    SELECT * FROM customer_admin_transfers
    WHERE token = $1
  `;

  try {
    const result = await db.query(query, [token]);
    return { success: true, data: result.rows[0] ?? null };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function updateAdminTransferStatus(
  db: Pool | PoolClient,
  transferId: string,
  status: string,
): Promise<Result<CustomerAdminTransfer, string>> {
  const query = `
    UPDATE customer_admin_transfers
    SET status = $1, updated_at = now()
    WHERE transfer_id = $2
    RETURNING *
  `;

  try {
    const result = await db.query(query, [status, transferId]);
    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Admin transfer not found" };
    }
    return { success: true, data: row };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getPendingAdminTransferByCustomerId(
  db: Pool | PoolClient,
  customerId: string,
): Promise<Result<CustomerAdminTransfer | null, string>> {
  const query = `
    SELECT * FROM customer_admin_transfers
    WHERE customer_id = $1 AND status = 'PENDING'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  try {
    const result = await db.query(query, [customerId]);
    return { success: true, data: result.rows[0] ?? null };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}
