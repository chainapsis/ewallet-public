import {
  getKSNodeByPublicKey,
  getLatestKSNodeTelemetries,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import dayjs from "dayjs";
import type { Pool } from "pg";
import type { Logger } from "winston";

import type { SlackAlertManager } from "@oko-wallet-api/lib/slack_alert_manager";

const HEARTBEAT_THRESHOLD_MINUTES = 10;
const HEARTBEAT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
const HEARTBEAT_REMINDER_MS = 30 * 60 * 1000; // 30 minutes

export function startKSNodeHeartbeatRuntime(
  db: Pool,
  logger: Logger,
  options: { intervalSeconds: number; alertManager: SlackAlertManager },
) {
  logger.info("Starting KS Node heartbeat runtime");

  const run = async () => {
    try {
      await checkKSNodeHeartbeats(db, logger, options.alertManager);
    } catch (err) {
      logger.error("KS Node heartbeat runtime error: %s", err);
    }
  };

  run().then();
  setInterval(run, options.intervalSeconds * 1000);
}

async function checkKSNodeHeartbeats(
  db: Pool,
  logger: Logger,
  alertManager: SlackAlertManager,
) {
  const latestTelemetriesRes = await getLatestKSNodeTelemetries(db);
  if (!latestTelemetriesRes.success) {
    logger.error(
      "Failed to get latest KS node telemetries: %s",
      latestTelemetriesRes.err,
    );
    return;
  }

  const now = dayjs();
  const threshold = now.subtract(HEARTBEAT_THRESHOLD_MINUTES, "minute");

  const unresponsiveAlerts: {
    key: string;
    message: string;
    options: { cooldownMs: number; reminderIntervalMs: number };
  }[] = [];
  const recoveredKeys: string[] = [];

  for (const telemetry of latestTelemetriesRes.data) {
    const lastUpdate = dayjs(telemetry.created_at);
    const publicKey = telemetry.public_key;
    const alertKey = `heartbeat:${publicKey}`;

    if (lastUpdate.isBefore(threshold)) {
      const nodeRes = await getKSNodeByPublicKey(db, publicKey);
      const nodeName =
        nodeRes.success && nodeRes.data
          ? `${nodeRes.data.node_name} (${publicKey})`
          : publicKey;

      unresponsiveAlerts.push({
        key: alertKey,
        message: `Node ${nodeName} has not reported telemetry for over ${HEARTBEAT_THRESHOLD_MINUTES} minutes. Last seen: ${lastUpdate.toISOString()}`,
        options: {
          cooldownMs: HEARTBEAT_COOLDOWN_MS,
          reminderIntervalMs: HEARTBEAT_REMINDER_MS,
        },
      });
    } else {
      recoveredKeys.push(alertKey);
    }
  }

  // Resolve recovered nodes
  for (const key of recoveredKeys) {
    alertManager.resolve(key);
  }

  // Send resolved notifications if any
  await alertManager.sendResolvedBatch(recoveredKeys);

  // Batch alert for unresponsive nodes
  if (unresponsiveAlerts.length > 0) {
    await alertManager.batchAlert(unresponsiveAlerts);
  }
}
