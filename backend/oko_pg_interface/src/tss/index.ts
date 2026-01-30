import { Pool, type PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import type { Result } from "@oko-wallet/stdlib-js";
import type {
  CreateTssSessionRequest,
  CreateTssStageRequest,
  TssSession,
  TssSessionWithCustomerAndUser,
  TssStage,
  TssStageWithSessionData,
  UpdateTssStageRequest,
} from "@oko-wallet/oko-types/tss";
import { TssSessionState, TssStageType } from "@oko-wallet/oko-types/tss";

export async function createTssSession(
  db: Pool | PoolClient,
  sessionData: CreateTssSessionRequest,
): Promise<Result<TssSession, string>> {
  try {
    const query = `
INSERT INTO tss_sessions (
  session_id, customer_id, wallet_id, state
)
VALUES (
  $1, $2, $3, $4
)
RETURNING *
`;

    const values = [
      uuidv4(),
      sessionData.customer_id,
      sessionData.wallet_id,
      TssSessionState.IN_PROGRESS,
    ];

    const result = await db.query(query, values);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Failed to create tss session",
      };
    }

    return {
      success: true,
      data: row as TssSession,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getTssSessionById(
  db: Pool | PoolClient,
  sessionId: string,
): Promise<Result<TssSession | null, string>> {
  try {
    const query = `
SELECT * 
FROM tss_sessions 
WHERE session_id = $1 
LIMIT 1
`;

    const result = await db.query(query, [sessionId]);

    let session: TssSession | null = null;
    if (result.rows.length > 0) {
      session = result.rows[0] as TssSession;
    }

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function updateTssSessionState(
  db: Pool | PoolClient,
  sessionId: string,
  state: TssSessionState,
): Promise<Result<void, string>> {
  try {
    const query = `
UPDATE tss_sessions 
SET state = $1, updated_at = now() 
WHERE session_id = $2
`;

    const result = await db.query(query, [state, sessionId]);

    if (!result.rowCount || result.rowCount === 0) {
      return {
        success: false,
        err: "Failed to update tss session state",
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

export async function createTssStage(
  db: Pool | PoolClient,
  stageData: CreateTssStageRequest,
): Promise<Result<TssStage, string>> {
  try {
    const query = `
INSERT INTO tss_stages (
  stage_id, session_id, stage_type, 
  stage_status, stage_data
)
VALUES (
  $1, $2, $3, 
  $4, $5
)
RETURNING *
`;

    const values = [
      uuidv4(),
      stageData.session_id,
      stageData.stage_type,
      stageData.stage_status,
      stageData.stage_data,
    ];

    const result = await db.query(query, values);

    const row = result.rows[0];
    if (!row) {
      return {
        success: false,
        err: "Failed to create tss stage",
      };
    }

    return {
      success: true,
      data: row as TssStage,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getTssStageBySessionIdAndStageType(
  db: Pool | PoolClient,
  sessionId: string,
  stageType: TssStageType,
): Promise<Result<TssStage | null, string>> {
  try {
    const query = `
SELECT * 
FROM tss_stages 
WHERE session_id = $1 AND stage_type = $2 
LIMIT 1
`;

    const result = await db.query(query, [sessionId, stageType]);

    let stage: TssStage | null = null;
    if (result.rows.length > 0) {
      stage = result.rows[0] as TssStage;
    }

    return {
      success: true,
      data: stage,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function updateTssStage(
  db: Pool | PoolClient,
  stageId: string,
  stageData: UpdateTssStageRequest,
): Promise<Result<void, string>> {
  try {
    const query = `
UPDATE tss_stages 
SET 
  stage_status = $1, 
  stage_data = $2, 
  error_message = $3, 
  updated_at = now() 
WHERE stage_id = $4
`;

    const result = await db.query(query, [
      stageData.stage_status,
      stageData.stage_data,
      stageData.error_message,
      stageId,
    ]);

    if (!result.rowCount || result.rowCount === 0) {
      return {
        success: false,
        err: "Failed to update tss stage",
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

export async function getTssStageWithSessionData(
  db: Pool | PoolClient,
  sessionId: string,
  stageType: TssStageType,
): Promise<Result<TssStageWithSessionData | null, string>> {
  try {
    const query = `
SELECT 
  stage.*, 
  session.wallet_id, 
  session.state AS session_state
FROM tss_stages stage
JOIN tss_sessions session ON stage.session_id = session.session_id
WHERE stage.session_id = $1 AND stage.stage_type = $2
LIMIT 1
`;

    const result = await db.query(query, [sessionId, stageType]);

    let stageWithSessionData: TssStageWithSessionData | null = null;
    if (result.rows.length > 0) {
      stageWithSessionData = result.rows[0] as TssStageWithSessionData;
    }

    return {
      success: true,
      data: stageWithSessionData,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getTssSessions(
  db: Pool | PoolClient,
  limit: number,
  offset: number,
  node_id?: string,
  customer_id?: string,
  curve_type?: string,
): Promise<Result<TssSessionWithCustomerAndUser[], string>> {
  try {
    const baseQuery = `
SELECT
  s.*,
  c.label AS customer_label,
  c.url AS customer_url,
  encode(w.public_key, 'hex') AS wallet_public_key,
  u.email AS user_email,
  w.curve_type AS curve_type
FROM tss_sessions s
JOIN customers c ON s.customer_id = c.customer_id
LEFT JOIN oko_wallets w ON s.wallet_id = w.wallet_id
LEFT JOIN oko_users u ON w.user_id = u.user_id
`;

    const conditions: string[] = [];
    const queryParams: any[] = [limit, offset];
    let paramIndex = 3;

    if (node_id) {
      conditions.push(`EXISTS (
        SELECT 1 
        FROM wallet_ks_nodes wk 
        WHERE wk.wallet_id = w.wallet_id AND wk.node_id = $${paramIndex}
      )`);
      queryParams.push(node_id);
      paramIndex++;
    }

    if (customer_id) {
      conditions.push(`s.customer_id = $${paramIndex}`);
      queryParams.push(customer_id);
      paramIndex++;
    }

    if (curve_type) {
      conditions.push(`w.curve_type = $${paramIndex}`);
      queryParams.push(curve_type);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ``;

    const orderAndLimit = `
${whereClause}
ORDER BY s.created_at DESC
LIMIT $1 
OFFSET $2
`;

    const query = `${baseQuery} ${orderAndLimit}`;

    const result = await db.query(query, queryParams);
    return {
      success: true,
      data: result.rows as TssSessionWithCustomerAndUser[],
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function getTssSessionsExistenceByCustomerIds(
  db: Pool | PoolClient,
  customerIds: string[],
): Promise<Result<Map<string, boolean>, string>> {
  try {
    if (customerIds.length === 0) {
      return {
        success: true,
        data: new Map(),
      };
    }

    const query = `
SELECT DISTINCT customer_id
FROM tss_sessions
WHERE customer_id = ANY($1)
`;

    const result = await db.query(query, [customerIds]);

    const existenceMap = new Map<string, boolean>();

    customerIds.forEach((id) => {
      existenceMap.set(id, false);
    });

    result.rows.forEach((row) => {
      existenceMap.set(row.customer_id, true);
    });

    return {
      success: true,
      data: existenceMap,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}
