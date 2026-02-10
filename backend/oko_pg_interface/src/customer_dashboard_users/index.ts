import type {
  CustomerAndCTDUser,
  CustomerAndCTDUserWithPasswordHash,
  CustomerDashboardUser,
  DeleteCustomerDashboardUsersByCustomerIdRequest,
  DeleteCustomerDashboardUsersByCustomerIdResponse,
  InsertCustomerDashboardUserRequest,
  InsertCustomerDashboardUserResponse,
  UpdateCustomerAccountPasswordRequest,
  UpdateCustomerAccountPasswordReseponse,
  VerifyCustomerAccountEmailRequest,
  VerifyCustomerAccountEmailResponse,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";

export async function insertCustomerDashboardUser(
  db: Pool | PoolClient,
  user: InsertCustomerDashboardUserRequest,
): Promise<Result<InsertCustomerDashboardUserResponse, string>> {
  const query = `
INSERT INTO customer_dashboard_users (
  user_id, customer_id, email, 
  status, is_email_verified, password_hash
)
VALUES (
  $1, $2, $3, 
  $4, $5, $6
)
RETURNING *
`;

  try {
    const res = await db.query(query, [
      user.user_id,
      user.customer_id,
      user.email,
      user.status,
      user.is_email_verified,
      user.password_hash,
    ]);

    const row = res.rows[0];
    if (!row) {
      return {
        success: false,
        err: `Failed to create customer dashboard user`,
      };
    }

    return { success: true, data: row };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getCTDUserWithCustomerByEmail(
  db: Pool,
  email: string,
): Promise<Result<CustomerAndCTDUser | null, string>> {
  const query = `
SELECT 
  u.user_id, u.customer_id, u.email, u.status, 
  u.is_email_verified, c.label, c.url, c.logo_url, 
  c.status as customer_status
FROM customer_dashboard_users u
INNER JOIN customers c ON u.customer_id = c.customer_id
WHERE u.email = $1 AND u.status = 'ACTIVE' 
  AND c.status = 'ACTIVE'
LIMIT 1
`;

  try {
    const result = await db.query(query, [email]);

    if (result.rows.length === 0) {
      return {
        success: true,
        data: null,
      };
    } else {
      const r = result.rows[0];
      const ret: CustomerAndCTDUser = {
        user: {
          customer_id: r.customer_id,
          user_id: r.user_id,
          email: r.email,
          status: r.status,
          is_email_verified: r.is_email_verified,
        },
        customer_id: r.customer_id,
        status: r.customer_status,
        label: r.label,
        url: r.url,
        logo_url: r.logo_url,
        theme: r.theme,
      };

      return { success: true, data: ret };
    }
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

// Assume 1:1 mapping(email <-> customer_id) for now
export async function getCTDUserWithCustomerAndPasswordHashByEmail(
  db: Pool,
  email: string,
): Promise<Result<CustomerAndCTDUserWithPasswordHash | null, string>> {
  const query = `
SELECT u.*, c.label, c.url, c.logo_url, c.status as customer_status
FROM customer_dashboard_users u
INNER JOIN customers c ON u.customer_id = c.customer_id
WHERE u.email = $1 AND u.status = 'ACTIVE' 
  AND c.status = 'ACTIVE'
LIMIT 1
`;

  try {
    const result = await db.query(query, [email]);

    if (result.rows.length === 0) {
      return {
        success: true,
        data: null,
      };
    } else {
      const r = result.rows[0];
      const ret: CustomerAndCTDUserWithPasswordHash = {
        user: {
          customer_id: r.customer_id,
          user_id: r.user_id,
          email: r.email,
          status: r.status,
          is_email_verified: r.is_email_verified,
          password_hash: r.password_hash,
        },
        customer_id: r.customer_id,
        status: r.customer_status,
        label: r.label,
        url: r.url,
        logo_url: r.logo_url,
        theme: r.theme,
      };

      return { success: true, data: ret };
    }
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function updateCustomerDashboardUserPassword(
  db: Pool | PoolClient,
  request: UpdateCustomerAccountPasswordRequest,
): Promise<Result<UpdateCustomerAccountPasswordReseponse, string>> {
  const query = `
UPDATE customer_dashboard_users
SET
  password_hash = $1,
  updated_at = now()
WHERE user_id = $2 AND status = 'ACTIVE'
RETURNING user_id
`;

  try {
    const result = await db.query(query, [
      request.password_hash,
      request.user_id,
    ]);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: `customer account not exists or already deleted, user_id: ${request.user_id}`,
      };
    }

    return { success: true, data: { user_id: row.user_id } };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function verifyCustomerDashboardUserEmail(
  db: Pool,
  request: VerifyCustomerAccountEmailRequest,
): Promise<Result<VerifyCustomerAccountEmailResponse, string>> {
  const query = `
UPDATE customer_dashboard_users
SET
  is_email_verified = true,
  email_verified_at = now(),
  updated_at = now()
WHERE user_id = $1 AND status = 'ACTIVE'
RETURNING *
`;

  try {
    const result = await db.query(query, [request.user_id]);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: `customer account not exists or already deleted, user_id: ${request.user_id}`,
      };
    }

    const ret: VerifyCustomerAccountEmailResponse = {
      user_id: row.user_id,
      is_email_verified: row.is_email_verified,
    };

    return { success: true, data: ret };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function deleteCustomerDashboardUserByCustomerId(
  db: Pool | PoolClient,
  request: DeleteCustomerDashboardUsersByCustomerIdRequest,
): Promise<Result<DeleteCustomerDashboardUsersByCustomerIdResponse, string>> {
  const query = `
  UPDATE customer_dashboard_users
  SET
    status = 'DELETED',
    updated_at = now()
  WHERE customer_id = $1 AND status = 'ACTIVE'
  RETURNING customer_id, user_id, status
  `;

  try {
    const result = await db.query(query, [request.customer_id]);
    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: `customer account not exists or already deleted, customer_id: ${request.customer_id}`,
      };
    }

    const ret: DeleteCustomerDashboardUsersByCustomerIdResponse = {
      customer_id: row.customer_id,
      customer_dashboard_user_ids: result.rows.map(
        (r) => r.user_id,
      ) as string[],
      status: row.status,
    };

    return { success: true, data: ret };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getCTDUsersByCustomerIdsMap(
  db: Pool | PoolClient,
  customerIds: string[],
): Promise<Result<Map<string, CustomerDashboardUser[]>, string>> {
  if (customerIds.length === 0) {
    return { success: true, data: new Map() };
  }

  const query = `
  SELECT *
  FROM customer_dashboard_users
  WHERE customer_id = ANY($1::uuid[]) AND status = 'ACTIVE'
  ORDER BY created_at ASC
  `;

  try {
    const result = await db.query(query, [customerIds]);

    if (result.rows.length === 0) {
      return { success: true, data: new Map() };
    }

    return {
      success: true,
      data: result.rows.reduce((acc, row) => {
        acc.set(row.customer_id, [...(acc.get(row.customer_id) || []), row]);
        return acc;
      }, new Map<string, CustomerDashboardUser[]>()),
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getUnverifiedCustomerDashboardUsers(
  db: Pool | PoolClient,
  timeUntilVerifiedMs: number,
): Promise<Result<CustomerAndCTDUser[], string>> {
  const query = `
SELECT 
  c.customer_id,
  c.label,
  c.status,
  c.url,
  c.logo_url,
  u.user_id,
  u.email,
  u.status as user_status,
  u.is_email_verified
FROM customer_dashboard_users u
JOIN customers c ON u.customer_id = c.customer_id
WHERE u.status = 'ACTIVE'
  AND c.status = 'ACTIVE'
  AND u.is_email_verified = false
  AND u.created_at < NOW() - ($1::bigint * interval '1 millisecond')
  AND NOT EXISTS (
      SELECT 1 FROM email_sent_logs r WHERE r.target_id = u.user_id AND r.type = $2
  )
`;

  try {
    const result = await db.query(query, [
      timeUntilVerifiedMs,
      "UNVERIFIED_CUSTOMER_USER",
    ]);
    const data: CustomerAndCTDUser[] = result.rows.map((row) => ({
      customer_id: row.customer_id,
      label: row.label,
      status: row.status,
      url: row.url,
      logo_url: row.logo_url,
      user: {
        customer_id: row.customer_id,
        user_id: row.user_id,
        email: row.email,
        status: row.user_status,
        is_email_verified: row.is_email_verified,
      },
      theme: row.theme,
    }));
    return { success: true, data };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getInactiveCustomerDashboardUsers(
  db: Pool | PoolClient,
  timeUntilInactiveMs: number,
): Promise<Result<CustomerAndCTDUser[], string>> {
  const query = `
SELECT 
  c.customer_id,
  c.label,
  c.status,
  c.url,
  c.logo_url,
  u.user_id,
  u.email,
  u.status as user_status,
  u.is_email_verified
FROM customer_dashboard_users u
JOIN customers c ON u.customer_id = c.customer_id
WHERE u.status = 'ACTIVE'
  AND c.status = 'ACTIVE'
  AND u.email_verified_at < NOW() - ($1::bigint * interval '1 millisecond')
  AND NOT EXISTS (
      SELECT 1 FROM tss_sessions s WHERE s.customer_id = c.customer_id
  )
  AND NOT EXISTS (
      SELECT 1 FROM email_sent_logs r WHERE r.target_id = u.user_id AND r.type = $2
  )
`;

  try {
    const result = await db.query(query, [
      timeUntilInactiveMs,
      "INACTIVE_CUSTOMER_USER",
    ]);
    const data: CustomerAndCTDUser[] = result.rows.map((row) => ({
      customer_id: row.customer_id,
      label: row.label,
      status: row.status,
      url: row.url,
      logo_url: row.logo_url,
      user: {
        customer_id: row.customer_id,
        user_id: row.user_id,
        email: row.email,
        status: row.user_status,
        is_email_verified: row.is_email_verified,
      },
      theme: row.theme,
    }));
    return { success: true, data };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}
