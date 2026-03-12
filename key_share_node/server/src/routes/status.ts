import type { ServerStatus } from "@oko-wallet/ksn-interface/status";
import { getLatestCompletedPgDump } from "@oko-wallet/ksn-pg-interface";
import dayjs from "dayjs";
import type { Express, Response } from "express";

import { logger } from "@oko-wallet-ksn-server/logger";
import { registry } from "@oko-wallet-ksn-server/openapi/doc";
import {
  ErrorResponseSchema,
  ServerStatusSchema,
} from "@oko-wallet-ksn-server/openapi/schema";

export function addStatusRoutes(app: Express) {
  registry.registerPath({
    method: "get",
    path: "/status",
    tags: ["Status"],
    summary: "Get server status",
    description: "Returns database and backup health with server metadata",
    responses: {
      200: {
        description: "Status retrieved successfully",
        content: {
          "application/json": {
            schema: ServerStatusSchema,
          },
        },
      },
      500: {
        description: "Server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });
  app.get("/status", async (req, res: Response<ServerStatus>) => {
    const state = req.app.locals;
    const { db } = state;

    let isDbConnected = false;
    try {
      await db.query("SELECT 1");
      isDbConnected = true;
    } catch (err) {
      logger.error("Database connection check failed, err: %s", err);
    }

    let latestBackupTime: string | null = null;
    try {
      const getLatestDumpRes = await getLatestCompletedPgDump(db);
      if (getLatestDumpRes.success) {
        if (getLatestDumpRes.data?.created_at) {
          latestBackupTime = dayjs(
            getLatestDumpRes.data?.created_at,
          ).toISOString();
        }
      } else {
        logger.error("Failed to get latest dump:", getLatestDumpRes.err);
      }
    } catch (err: any) {
      logger.error("Get latest pg dump, err: %s", err);
    }

    const status: ServerStatus = {
      is_db_connected: isDbConnected,
      is_db_backup_checked: state.is_db_backup_checked,
      latest_backup_time: latestBackupTime,
      ks_node_public_key: state.serverKeypair.publicKey.toHex(),
      launch_time: state.launch_time,
      git_hash: state.git_hash,
      version: state.version,
    };

    res.status(200).json(status);
  });
}
