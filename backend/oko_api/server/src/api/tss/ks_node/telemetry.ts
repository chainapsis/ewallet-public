import {
  getKSNodeByPublicKey,
  getLastKSNodeTelemetry,
  insertKSNodeTelemetry,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool } from "pg";

import { shouldAlert } from "@oko-wallet-api/lib/alert_throttle";
import { sendSlackAlert } from "@oko-wallet-api/lib/slack";

export interface KSNodeTelemetryPayload {
  public_key: string;
  key_share_count: number;
  payload: any;
}

const DB_ERROR_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const KEY_SHARE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export async function processKSNodeTelemetry(
  db: Pool,
  input: KSNodeTelemetryPayload,
  slackWebhookUrl: string | null,
): Promise<Result<void, string>> {
  const { public_key, key_share_count, payload } = input;

  // 1. Check if node exists
  const nodeRes = await getKSNodeByPublicKey(db, public_key);
  if (!nodeRes.success) {
    if (shouldAlert("db-error:node-lookup", DB_ERROR_INTERVAL_MS)) {
      await sendSlackAlert(
        `[TSS API Error] Failed to check if node exists ${public_key}: ${nodeRes.err}`,
        slackWebhookUrl,
      );
    }
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
    if (shouldAlert("db-error:get-last-telemetry", DB_ERROR_INTERVAL_MS)) {
      await sendSlackAlert(
        `[TSS API Error] Failed to get last telemetry for node ${public_key}: ${lastTelemetryRes.err}`,
        slackWebhookUrl,
      );
    }
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
    if (shouldAlert("db-error:insert-telemetry", DB_ERROR_INTERVAL_MS)) {
      await sendSlackAlert(
        `[TSS API Error] Failed to insert telemetry for node ${public_key}: ${insertRes.err}`,
        slackWebhookUrl,
      );
    }
    return { success: false, err: insertRes.err };
  }

  // 4. Check for anomalies
  const nodeName = `${nodeRes.data!.node_name} (${public_key})`;

  if (lastTelemetry && key_share_count < lastTelemetry.key_share_count) {
    if (
      shouldAlert(
        `anomaly:key-share-decrease:${public_key}`,
        KEY_SHARE_INTERVAL_MS,
      )
    ) {
      await sendSlackAlert(
        `[KS Node Alert] Key share count decreased for node: ${nodeName}. Previous: ${lastTelemetry.key_share_count}, Current: ${key_share_count}`,
        slackWebhookUrl,
      );
    }
  }

  return { success: true, data: void 0 };
}
