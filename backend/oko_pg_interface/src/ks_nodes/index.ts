import type {
  KeyShareNode,
  KSNodeHealthCheck,
  KSNodeStatus,
  KSNodeTelemetry,
  KSNodeWithHealthCheck,
  WalletKSNodeStatus,
  WalletKSNodeWithNodeNameAndServerUrl,
} from "@oko-wallet/oko-types/tss";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";

import type { WithPagination, WithTime } from "@oko-wallet-types/aux_types";

export async function insertKSNodeTelemetry(
  db: Pool | PoolClient,
  public_key: string,
  key_share_count: number,
  payload: any,
): Promise<Result<void, string>> {
  const query = `
INSERT INTO ks_node_telemetry (
  log_id, public_key, key_share_count, 
  payload
)
VALUES (
  $1, $2, $3,
  $4
)
`;

  try {
    await db.query(query, [uuidv4(), public_key, key_share_count, payload]);

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

export async function getLastKSNodeTelemetry(
  db: Pool | PoolClient,
  public_key: string,
): Promise<Result<KSNodeTelemetry | null, string>> {
  const query = `
SELECT *
FROM ks_node_telemetry
WHERE public_key = $1
ORDER BY created_at DESC
LIMIT 1
`;

  try {
    const result = await db.query(query, [public_key]);
    const row = result.rows[0];

    if (!row) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        log_id: row.log_id,
        public_key: row.public_key,
        key_share_count: row.key_share_count,
        payload: row.payload,
        created_at: row.created_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getLatestKSNodeTelemetries(
  db: Pool | PoolClient,
): Promise<Result<{ public_key: string; created_at: Date }[], string>> {
  const query = `
SELECT DISTINCT ON (public_key) public_key, created_at
FROM ks_node_telemetry
ORDER BY public_key, created_at DESC
`;

  try {
    const result = await db.query(query);
    return {
      success: true,
      data: result.rows.map((row) => ({
        public_key: row.public_key,
        created_at: row.created_at,
      })),
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getKSNodeByPublicKey(
  db: Pool | PoolClient,
  public_key: string,
): Promise<Result<KeyShareNode | null, string>> {
  const query = `
SELECT *
FROM key_share_nodes
WHERE public_key = $1 AND deleted_at IS NULL
`;

  try {
    const result = await db.query<KeyShareNode>(query, [public_key]);
    return {
      success: true,
      data: result.rows[0] || null,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getKSNodeById(
  db: Pool | PoolClient,
  nodeId: string,
): Promise<Result<KeyShareNode | null, string>> {
  const query = `
SELECT *
FROM key_share_nodes
WHERE node_id = $1 AND deleted_at IS NULL
LIMIT 1
`;

  try {
    const result = await db.query<KeyShareNode>(query, [nodeId]);

    const row = result.rows[0];
    if (!row) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: row,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getActiveKSNodes(
  db: Pool | PoolClient,
): Promise<Result<KeyShareNode[], string>> {
  const query = `
SELECT *
FROM key_share_nodes
WHERE status = $1 AND deleted_at IS NULL
`;

  try {
    const result = await db.query<KeyShareNode>(query, [
      "ACTIVE" as KSNodeStatus,
    ]);

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

export async function getAllKSNodes(
  db: Pool | PoolClient,
): Promise<Result<KeyShareNode[], string>> {
  const query = `
SELECT *
FROM key_share_nodes
WHERE deleted_at IS NULL
`;

  try {
    const result = await db.query<KeyShareNode>(query);

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

export async function getKSNodesByServerUrl(
  db: Pool | PoolClient,
  serverUrls: string[],
): Promise<Result<KeyShareNode[], string>> {
  if (serverUrls.length === 0) {
    return {
      success: true,
      data: [],
    };
  }

  const query = `
SELECT *
FROM key_share_nodes
WHERE server_url = ANY($1) AND deleted_at IS NULL
`;

  try {
    const result = await db.query<KeyShareNode>(query, [serverUrls]);

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

export async function insertKSNode(
  db: Pool | PoolClient,
  nodeName: string,
  serverUrl: string,
): Promise<Result<KeyShareNode, string>> {
  const query = `
INSERT INTO key_share_nodes (
  node_id, node_name, server_url
)
VALUES (
  $1, $2, $3
)
RETURNING *
`;

  const values = [uuidv4(), nodeName, serverUrl];

  try {
    const result = await db.query<KeyShareNode>(query, values);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Failed to create ks node",
      };
    }

    return {
      success: true,
      data: row,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function createWalletKSNodes(
  db: Pool | PoolClient,
  walletId: string,
  nodeIds: string[],
): Promise<Result<void, string>> {
  if (nodeIds.length === 0) {
    return {
      success: true,
      data: void 0,
    };
  }

  try {
    const placeholders: string[] = [];
    const values: any[] = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const placeholderIdx = i * 3 + 1;
      placeholders.push(
        `($${placeholderIdx}, $${placeholderIdx + 1}, $${placeholderIdx + 2})`,
      );
      values.push(uuidv4(), walletId, nodeIds[i]);
    }

    const query = `
INSERT INTO wallet_ks_nodes (
  wallet_ks_node_id, wallet_id, node_id
)
VALUES ${placeholders.join(",")}
`;

    await db.query(query, values);

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

export async function getWalletKSNodesByWalletId(
  db: Pool | PoolClient,
  walletId: string,
): Promise<Result<WalletKSNodeWithNodeNameAndServerUrl[], string>> {
  try {
    const query = `
SELECT
  wk.*, k.node_name, k.server_url
FROM wallet_ks_nodes AS wk
JOIN key_share_nodes AS k ON wk.node_id = k.node_id
WHERE wk.wallet_id = $1
`;

    const result = await db.query<WalletKSNodeWithNodeNameAndServerUrl>(query, [
      walletId,
    ]);

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

export async function createKSNodeHealthChecks(
  db: Pool | PoolClient,
  healthChecks: KSNodeHealthCheck[],
): Promise<Result<void, string>> {
  if (healthChecks.length === 0) {
    return {
      success: true,
      data: void 0,
    };
  }

  const placeholders: string[] = [];
  const values: any[] = [];
  for (let i = 0; i < healthChecks.length; i++) {
    const placeholderIndex = i * 3 + 1;
    placeholders.push(
      `($${placeholderIndex}, $${placeholderIndex + 1}, $${placeholderIndex + 2})`,
    );
    values.push(uuidv4(), healthChecks[i].node_id, healthChecks[i].status);
  }

  const query = `
INSERT INTO ks_node_health_checks (
  check_id, node_id, status
)
VALUES ${placeholders.join(",")}
`;

  try {
    await db.query(query, values);

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

export async function selectKSNodeHealthChecks(
  db: Pool | PoolClient,
  pageIdx: number,
  pageSize: number,
): Promise<Result<WithPagination<WithTime<KSNodeHealthCheck>[]>, string>> {
  const offset = pageIdx * pageSize;

  const query = `
SELECT *
FROM ks_node_health_checks
OFFSET $1
LIMIT $2;
`;

  try {
    const result = await db.query(query, [offset, pageSize + 1]);
    const rows: WithTime<KSNodeHealthCheck>[] = result.rows.map((r) => ({
      check_id: r.check_id,
      node_id: r.node_id,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.created_at,
    }));

    const has_next = rows.length > pageSize;
    rows.pop();

    return {
      success: true,
      data: { rows, has_next },
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getAllKSNodesWithHealthCheck(
  db: Pool | PoolClient,
): Promise<Result<KSNodeWithHealthCheck[], string>> {
  const query = `
SELECT
  k.*,
  khc.status AS health_check_status,
  khc.created_at AS health_checked_at
FROM key_share_nodes k
LEFT JOIN (
  SELECT DISTINCT ON (node_id) *
  FROM ks_node_health_checks
  ORDER BY node_id, created_at DESC
) khc ON k.node_id = khc.node_id
WHERE k.deleted_at IS NULL;
`;

  try {
    const result = await db.query<KSNodeWithHealthCheck>(query);

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

export async function updateKSNodeStatus(
  db: Pool | PoolClient,
  nodeId: string,
  status: KSNodeStatus,
): Promise<Result<void, string>> {
  const query = `
UPDATE key_share_nodes
SET status = $1, updated_at = now()
WHERE node_id = $2 AND deleted_at IS NULL
`;

  try {
    await db.query(query, [status, nodeId]);

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

export async function updateKSNodeInfo(
  db: Pool | PoolClient,
  nodeId: string,
  serverUrl: string,
): Promise<Result<void, string>> {
  const query = `
UPDATE key_share_nodes
SET server_url = $1, updated_at = now()
WHERE node_id = $2 AND deleted_at IS NULL
`;

  try {
    await db.query(query, [serverUrl, nodeId]);

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

export async function deleteKSNodeById(
  db: Pool | PoolClient,
  nodeId: string,
): Promise<Result<void, string>> {
  const query = `
UPDATE key_share_nodes
SET deleted_at = now(), updated_at = now()
WHERE node_id = $1 AND deleted_at IS NULL
`;

  try {
    const res = await db.query(query, [nodeId]);

    if (res.rowCount === 0) {
      return {
        success: false,
        err: "KS node not found or already deleted",
      };
    }

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

export async function upsertWalletKSNodes(
  db: Pool | PoolClient,
  walletId: string,
  nodeIds: string[],
): Promise<Result<void, string>> {
  if (nodeIds.length === 0) {
    return {
      success: true,
      data: void 0,
    };
  }

  try {
    const placeholders: string[] = [];
    const values: any[] = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const base = i * 3;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      values.push(walletId, nodeIds[i], "ACTIVE" as WalletKSNodeStatus);
    }

    const query = `
INSERT INTO wallet_ks_nodes (
  wallet_id, node_id, status
)
VALUES ${placeholders.join(",")}
ON CONFLICT (wallet_id, node_id) DO UPDATE SET
  status = EXCLUDED.status
`;

    await db.query(query, values);

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
