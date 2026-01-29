import type { Pool, PoolClient } from "pg";
import type { Result } from "@oko-wallet/stdlib-js";
import type {
  CommitRevealSession,
  CreateSessionParams,
  SessionState,
} from "@oko-wallet/ksn-interface/commit_reveal";

export async function createCommitRevealSession(
  db: Pool | PoolClient,
  params: CreateSessionParams,
): Promise<Result<CommitRevealSession, string>> {
  try {
    const query = `
INSERT INTO "2_commit_reveal_sessions" (
  session_id, operation_type, client_ephemeral_pubkey,
  id_token_hash, expires_at
)
VALUES ($1, $2, $3, $4, $5)
RETURNING *
`;
    const values = [
      params.session_id,
      params.operation_type,
      params.client_ephemeral_pubkey,
      params.id_token_hash,
      params.expires_at,
    ];

    const result = await db.query(query, values);
    const row = result.rows[0];
    if (!row) {
      return { success: false, err: "Failed to create session" };
    }

    return { success: true, data: row as CommitRevealSession };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getCommitRevealSessionByIdTokenHash(
  db: Pool | PoolClient,
  idTokenHash: string,
): Promise<Result<CommitRevealSession | null, string>> {
  try {
    const query = `
SELECT * FROM "2_commit_reveal_sessions"
WHERE id_token_hash = $1
LIMIT 1
`;
    const result = await db.query(query, [idTokenHash]);
    const row = result.rows[0];
    if (!row) {
      return { success: true, data: null };
    }

    return { success: true, data: row as CommitRevealSession };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getCommitRevealSessionBySessionId(
  db: Pool | PoolClient,
  sessionId: string,
): Promise<Result<CommitRevealSession | null, string>> {
  try {
    const query = `
SELECT * FROM "2_commit_reveal_sessions"
WHERE session_id = $1
LIMIT 1
`;
    const result = await db.query(query, [sessionId]);
    const row = result.rows[0];
    if (!row) {
      return { success: true, data: null };
    }

    return { success: true, data: row as CommitRevealSession };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function updateCommitRevealSessionState(
  db: Pool | PoolClient,
  sessionId: string,
  state: SessionState,
): Promise<Result<void, string>> {
  try {
    const query = `
UPDATE "2_commit_reveal_sessions"
SET state = $2
WHERE session_id = $1
`;
    await db.query(query, [sessionId, state]);

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function createCommitRevealApiCall(
  db: Pool | PoolClient,
  sessionId: string,
  apiName: string,
  signature: Uint8Array,
): Promise<Result<void, string>> {
  try {
    const query = `
INSERT INTO "2_commit_reveal_api_calls" (session_id, api_name, signature)
VALUES ($1, $2, $3)
`;
    await db.query(query, [sessionId, apiName, signature]);

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function hasCommitRevealApiBeenCalled(
  db: Pool | PoolClient,
  sessionId: string,
  apiName: string,
): Promise<Result<boolean, string>> {
  try {
    const query = `
SELECT 1 FROM "2_commit_reveal_api_calls"
WHERE session_id = $1 AND api_name = $2
LIMIT 1
`;
    const result = await db.query(query, [sessionId, apiName]);

    return { success: true, data: result.rows.length > 0 };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}
