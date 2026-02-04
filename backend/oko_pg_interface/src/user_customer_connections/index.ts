import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";

export interface UserCustomerConnection {
  connection_id: string;
  user_id: string;
  customer_id: string;
  state: string;
  created_at: Date;
  updated_at: Date;
  label: string | null;
  logo_url: string | null;
  url: string | null;
}

export type ConnectionState = "ACTIVE" | "INACTIVE";

export async function insertUserCustomerConnectionIfNotExists(
  db: Pool | PoolClient,
  userId: string,
  customerId: string,
  state: ConnectionState = "ACTIVE",
): Promise<Result<UserCustomerConnection | null, string>> {
  try {
    const query = `
INSERT INTO oko_user_customer_connections (
  user_id, customer_id, state
) VALUES (
  $1, $2, $3
)
ON CONFLICT (user_id, customer_id) DO NOTHING
RETURNING *
`;
    const values = [userId, customerId, state];
    const result = await db.query<UserCustomerConnection>(query, values);

    return {
      success: true,
      data: result.rows[0] ?? null,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getConnectionsByUserId(
  db: Pool | PoolClient,
  userId: string,
): Promise<Result<UserCustomerConnection[], string>> {
  try {
    const query = `
SELECT conn.*, c.label, c.logo_url, c.url
FROM oko_user_customer_connections conn
JOIN customers c ON conn.customer_id = c.customer_id AND c.status = 'ACTIVE'
WHERE conn.user_id = $1
ORDER BY conn.created_at DESC
`;
    const result = await db.query<UserCustomerConnection>(query, [userId]);

    return {
      success: true,
      data: result.rows,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}
