import type { PgDumpConfig } from "@oko-wallet/ksn-pg-interface";
import type { Pool } from "pg";

import { deleteOldPgDumps, processPgDump } from "./dump";
import { logger } from "@oko-wallet-ksn-server/logger";
import { sleep } from "@oko-wallet-ksn-server/utils/time";

export interface PgDumpRuntimeOptions {
  dumpDir: string;
  sleepTimeSeconds: number;
  retentionDays: number;
}

export async function startPgDumpRuntime(
  pool: Pool,
  pgConfig: PgDumpConfig,
  pgDumpRuntimeOptions: PgDumpRuntimeOptions,
) {
  const sleepTime = pgDumpRuntimeOptions.sleepTimeSeconds * 1000;

  logger.info("Start pg dump runtime, sleep time: %s", sleepTime);

  while (true) {
    try {
      const processPgDumpRes = await processPgDump(
        pool,
        pgConfig,
        pgDumpRuntimeOptions.dumpDir,
      );
      if (processPgDumpRes.success === false) {
        logger.error("Error processing pg dump:", processPgDumpRes.err);
      } else {
        const { dumpId, dumpPath, dumpSize, dumpDuration } =
          processPgDumpRes.data;

        logger.debug(
          `Completed pg dump ${dumpId} in ${dumpDuration}s, \
path: ${dumpPath}, size: ${dumpSize} bytes`,
        );
      }

      const deleteOldPgDumpsRes = await deleteOldPgDumps(
        pool,
        pgDumpRuntimeOptions.retentionDays,
      );
      if (deleteOldPgDumpsRes.success === false) {
        logger.error("Error deleting old pg dumps:", deleteOldPgDumpsRes.err);
      } else {
        logger.debug(`Deleted ${deleteOldPgDumpsRes.data} old pg dumps`);
      }
    } catch (err: any) {
      logger.error("Error running pg dump, err: %s", err);
    } finally {
      await sleep(sleepTime);
    }
  }
}
