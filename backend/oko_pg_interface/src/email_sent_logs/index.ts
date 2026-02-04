import type {
  EmailSentLog,
  InsertEmailSentLogRequest,
} from "@oko-wallet/oko-types/ct_dashboard";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool, PoolClient } from "pg";

export async function insertEmailSentLog(
  db: Pool | PoolClient,
  request: InsertEmailSentLogRequest,
): Promise<Result<void, string>> {
  const query = `
INSERT INTO email_sent_logs (
  target_id, type, email
)
VALUES (
  $1, $2, $3
)
`;

  try {
    await db.query(query, [request.target_id, request.type, request.email]);
    return { success: true, data: void 0 };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function getEmailSentLogsByUserIdsMap(
  db: Pool | PoolClient,
  userIds: string[],
): Promise<Result<Map<string, EmailSentLog[]>, string>> {
  if (userIds.length === 0) {
    return { success: true, data: new Map() };
  }

  const query = `
SELECT
  log_id, target_id, type, email, sent_at
FROM
  email_sent_logs
WHERE
  target_id = ANY($1)
  `;

  try {
    const res = await db.query(query, [userIds]);
    const map = new Map<string, EmailSentLog[]>();
    for (const row of res.rows) {
      const logs = map.get(row.target_id) || [];
      logs.push(row);
      map.set(row.target_id, logs);
    }
    return { success: true, data: map };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}
