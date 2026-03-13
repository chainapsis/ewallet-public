import fs from "node:fs/promises";
import {
  createPgDump,
  dump,
  getOldCompletedPgDumps,
  type PgDumpConfig,
  updatePgDump,
  updatePgDumpStatus,
} from "@oko-wallet/ksn-pg-interface";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool } from "pg";

import { getSecondsFromNow } from "@oko-wallet-ksn-server/utils/time";

export interface PgDumpResult {
  dumpId: string;
  dumpPath: string;
  dumpSize: number;
  dumpDuration: number;
}

export async function processPgDump(
  pool: Pool,
  pgConfig: PgDumpConfig,
  dumpDir: string,
): Promise<Result<PgDumpResult, string>> {
  try {
    const createPgDumpRes = await createPgDump(pool);
    if (createPgDumpRes.success === false) {
      return {
        success: false,
        err: createPgDumpRes.err,
      };
    }
    const pgDump = createPgDumpRes.data;

    const start = Date.now();

    const dumpResult = await dump(pgConfig, dumpDir);
    if (dumpResult.success === false) {
      await updatePgDump(pool, pgDump.dump_id, "FAILED", null, {
        error: dumpResult.err,
      });
      return {
        success: false,
        err: `Failed to dump database: dumpId: ${pgDump.dump_id}, error: ${dumpResult.err}`,
      };
    }

    const { dumpPath, dumpSize } = dumpResult.data;
    const dumpDuration = getSecondsFromNow(start);
    await updatePgDump(pool, pgDump.dump_id, "COMPLETED", dumpPath, {
      dump_duration: dumpDuration,
      dump_size: dumpSize,
    });

    return {
      success: true,
      data: {
        dumpId: pgDump.dump_id,
        dumpPath,
        dumpSize,
        dumpDuration,
      },
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}

export async function deleteOldPgDumps(
  pool: Pool,
  retentionDays: number,
): Promise<Result<number, string>> {
  try {
    const oldDumpsResult = await getOldCompletedPgDumps(pool, retentionDays);
    if (oldDumpsResult.success === false) {
      return {
        success: false,
        err: oldDumpsResult.err,
      };
    }

    for (const dump of oldDumpsResult.data) {
      try {
        if (dump.dump_path) {
          await fs.unlink(dump.dump_path);
        }
        await updatePgDumpStatus(pool, dump.dump_id, "DELETED");
      } catch {
        await updatePgDumpStatus(pool, dump.dump_id, "DELETED");
      }
    }

    return {
      success: true,
      data: oldDumpsResult.data.length,
    };
  } catch (error) {
    return {
      success: false,
      err: String(error),
    };
  }
}
