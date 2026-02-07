import type { APIKey } from "@oko-wallet/oko-types/ct_dashboard";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";

export async function insertAPIKey(
  db: Pool | PoolClient,
  customerId: string,
  hashedKey: string,
): Promise<Result<APIKey, string>> {
  const query = `
INSERT INTO api_keys (
  key_id, customer_id, hashed_key
)
VALUES (
  $1, $2, $3
)
RETURNING *
`;

  try {
    const result = await db.query(query, [uuidv4(), customerId, hashedKey]);

    if (result.rows.length !== 1) {
      return {
        success: false,
        err: `Failed to insert API key, customer_id: ${customerId}`,
      };
    }

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getAPIKeysByCustomerId(
  db: Pool | PoolClient,
  customerId: string,
): Promise<Result<APIKey[], string>> {
  const query = `
SELECT * 
FROM api_keys 
WHERE customer_id = $1
`;

  try {
    const result = await db.query<APIKey>(query, [customerId]);

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

export async function getAPIKeysByCustomerIdsMap(
  db: Pool | PoolClient,
  customerIds: string[],
): Promise<Result<Map<string, APIKey[]>, string>> {
  if (customerIds.length === 0) {
    return {
      success: true,
      data: new Map(),
    };
  }

  const query = `
SELECT *
FROM api_keys 
WHERE customer_id = ANY($1::uuid[])
`;

  try {
    const result = await db.query<APIKey>(query, [customerIds]);

    if (result.rows.length === 0) {
      return {
        success: true,
        data: new Map(),
      };
    }

    return {
      success: true,
      data: result.rows.reduce((acc, row) => {
        acc.set(row.customer_id, [...(acc.get(row.customer_id) || []), row]);
        return acc;
      }, new Map<string, APIKey[]>()),
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getAPIKeyByHashedKey(
  db: Pool | PoolClient,
  hashedKey: string,
): Promise<Result<APIKey | null, string>> {
  const query = `
SELECT * 
FROM api_keys 
WHERE hashed_key = $1
LIMIT 1
`;

  try {
    const result = await db.query<APIKey>(query, [hashedKey]);

    let apiKey: APIKey | null = null;
    if (result.rows.length > 0) {
      apiKey = result.rows[0];
    }

    return {
      success: true,
      data: apiKey,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function updateAPIKeyStatusByHashedKey(
  db: Pool | PoolClient,
  hashedKey: string,
  isActive: boolean,
): Promise<Result<void, string>> {
  const query = `
UPDATE api_keys 
SET is_active = $1, updated_at = now()
WHERE hashed_key = $2
`;

  try {
    await db.query(query, [isActive, hashedKey]);

    return {
      success: true,
      data: void 0,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function updateAPIKeyStatusByCustomerId(
  db: Pool | PoolClient,
  customerId: string,
  isActive: boolean,
): Promise<Result<void, string>> {
  const query = `
UPDATE api_keys 
SET is_active = $1, updated_at = now()
WHERE customer_id = $2
`;

  try {
    await db.query(query, [isActive, customerId]);

    return {
      success: true,
      data: void 0,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}
