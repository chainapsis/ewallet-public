import {
  getKSNodeByPublicKey,
  getLatestKSNodeTelemetries,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import dayjs from "dayjs";
import type { Pool } from "pg";
import type { Logger } from "winston";

import {
  clearAlert,
  shouldAlert,
  wasAlerted,
} from "@oko-wallet-api/lib/alert_throttle";
import { sendSlackAlert } from "@oko-wallet-api/lib/slack";

const HEARTBEAT_THRESHOLD_MINUTES = 10;
const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function startKSNodeHeartbeatRuntime(
  db: Pool,
  logger: Logger,
  options: { intervalSeconds: number; slackWebhookUrl: string | null },
) {
  logger.info("Starting KS Node heartbeat runtime");

  const run = async () => {
    try {
      await checkKSNodeHeartbeats(db, logger, options.slackWebhookUrl);
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
  slackWebhookUrl: string | null,
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

  const toAlert: string[] = [];
  const recovered: string[] = [];

  for (const telemetry of latestTelemetriesRes.data) {
    const lastUpdate = dayjs(telemetry.created_at);
    const publicKey = telemetry.public_key;
    const alertKey = `heartbeat:${publicKey}`;

    if (lastUpdate.isBefore(threshold)) {
      if (shouldAlert(alertKey, HEARTBEAT_INTERVAL_MS)) {
        const nodeRes = await getKSNodeByPublicKey(db, publicKey);
        const nodeName =
          nodeRes.success && nodeRes.data
            ? `${nodeRes.data.node_name} (${publicKey})`
            : publicKey;

        toAlert.push(
          `Node ${nodeName} has not reported telemetry for over ${HEARTBEAT_THRESHOLD_MINUTES} minutes. Last seen: ${lastUpdate.toISOString()}`,
        );
      }
    } else {
      if (wasAlerted(alertKey)) {
        const nodeRes = await getKSNodeByPublicKey(db, publicKey);
        const nodeName =
          nodeRes.success && nodeRes.data
            ? `${nodeRes.data.node_name} (${publicKey})`
            : publicKey;

        recovered.push(`Node ${nodeName}`);
        clearAlert(alertKey);
      }
    }
  }

  // Send resolved notifications
  if (recovered.length === 1) {
    await sendSlackAlert(`[Resolved] ${recovered[0]}`, slackWebhookUrl);
  } else if (recovered.length > 1) {
    const body = recovered.map((m) => `  • ${m}`).join("\n");
    await sendSlackAlert(
      `[Resolved] ${recovered.length} nodes recovered:\n${body}`,
      slackWebhookUrl,
    );
  }

  // Send unresponsive alerts (batched)
  if (toAlert.length === 1) {
    await sendSlackAlert(`[KS Node Alert] ${toAlert[0]}`, slackWebhookUrl);
  } else if (toAlert.length > 1) {
    const body = toAlert.map((m) => `  • ${m}`).join("\n");
    await sendSlackAlert(
      `[KS Node Alert] ${toAlert.length} nodes unresponsive:\n${body}`,
      slackWebhookUrl,
    );
  }
}
