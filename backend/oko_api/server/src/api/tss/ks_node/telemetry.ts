import {
  getKSNodeByPublicKey,
  getLastKSNodeTelemetry,
  insertKSNodeTelemetry,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool } from "pg";

import type { SlackAlertManager } from "@oko-wallet-api/lib/slack_alert_manager";

export interface KSNodeTelemetryPayload {
  public_key: string;
  key_share_count: number;
  payload: any;
}

const DB_ERROR_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const DB_ERROR_REMINDER_MS = 30 * 60 * 1000; // 30 minutes
const KEY_SHARE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const KEY_SHARE_REMINDER_MS = 15 * 60 * 1000; // 15 minutes

export async function processKSNodeTelemetry(
  db: Pool,
  input: KSNodeTelemetryPayload,
  alertManager: SlackAlertManager,
): Promise<Result<void, string>> {
  const { public_key, key_share_count, payload } = input;

  // 1. Check if node exists
  const nodeRes = await getKSNodeByPublicKey(db, public_key);
  if (!nodeRes.success) {
    await alertManager.alert(
      `db-error:node-lookup:${public_key}`,
      `[TSS API Error] Failed to check if node exists ${public_key}: ${nodeRes.err}`,
      {
        cooldownMs: DB_ERROR_COOLDOWN_MS,
        reminderIntervalMs: DB_ERROR_REMINDER_MS,
      },
    );
    return { success: false, err: nodeRes.err };
  }

  if (!nodeRes.data) {
    // Node not registered, ignore telemetry
    console.warn(
      `[KS Node Telemetry] Ignored telemetry from unregistered node: ${public_key}`,
    );
    return { success: true, data: void 0 };
  }

  // 2. Get previous telemetry for comparison
  const lastTelemetryRes = await getLastKSNodeTelemetry(db, public_key);
  if (!lastTelemetryRes.success) {
    await alertManager.alert(
      `db-error:get-last-telemetry:${public_key}`,
      `[TSS API Error] Failed to get last telemetry for node ${public_key}: ${lastTelemetryRes.err}`,
      {
        cooldownMs: DB_ERROR_COOLDOWN_MS,
        reminderIntervalMs: DB_ERROR_REMINDER_MS,
      },
    );
    return { success: false, err: lastTelemetryRes.err };
  }

  const lastTelemetry = lastTelemetryRes.data;

  // 3. Insert new telemetry
  const insertRes = await insertKSNodeTelemetry(
    db,
    public_key,
    key_share_count,
    payload,
  );
  if (!insertRes.success) {
    await alertManager.alert(
      `db-error:insert-telemetry:${public_key}`,
      `[TSS API Error] Failed to insert telemetry for node ${public_key}: ${insertRes.err}`,
      {
        cooldownMs: DB_ERROR_COOLDOWN_MS,
        reminderIntervalMs: DB_ERROR_REMINDER_MS,
      },
    );
    return { success: false, err: insertRes.err };
  }

  // 4. Check for anomalies
  const nodeName = `${nodeRes.data!.node_name} (${public_key})`;

  if (lastTelemetry && key_share_count < lastTelemetry.key_share_count) {
    await alertManager.alert(
      `anomaly:key-share-decrease:${public_key}`,
      `[KS Node Alert] Key share count decreased for node: ${nodeName}. Previous: ${lastTelemetry.key_share_count}, Current: ${key_share_count}`,
      {
        cooldownMs: KEY_SHARE_COOLDOWN_MS,
        reminderIntervalMs: KEY_SHARE_REMINDER_MS,
      },
    );
  }

  return { success: true, data: void 0 };
}
