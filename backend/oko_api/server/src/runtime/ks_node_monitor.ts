import {
  getKSNodeByPublicKey,
  getLatestKSNodeTelemetries,
} from "@oko-wallet/oko-pg-interface/ks_nodes";
import dayjs from "dayjs";
import type { Pool } from "pg";
import type { Logger } from "winston";

import { sendSlackAlert } from "@oko-wallet-api/lib/slack";

const HEARTBEAT_THRESHOLD_MINUTES = 10;

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

  for (const telemetry of latestTelemetriesRes.data) {
    const lastUpdate = dayjs(telemetry.created_at);

    if (lastUpdate.isBefore(threshold)) {
      // Node is unresponsive
      const publicKey = telemetry.public_key;

      // Get node name
      const nodeRes = await getKSNodeByPublicKey(db, publicKey);
      const nodeName =
        nodeRes.success && nodeRes.data
          ? `${nodeRes.data.node_name} (${publicKey})`
          : publicKey;

      await sendSlackAlert(
        `[KS Node Alert] Node ${nodeName} has not reported telemetry for over ${HEARTBEAT_THRESHOLD_MINUTES} minutes. Last seen: ${lastUpdate.toISOString()}`,
        slackWebhookUrl,
      );
    }
  }
}
