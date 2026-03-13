import fs from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import { getAllPgDumps } from "@oko-wallet/ksn-pg-interface";
import type { Pool } from "pg";

import { connectPG, resetPgDatabase } from "@oko-wallet-ksn-server/database";
import { testPgConfig } from "@oko-wallet-ksn-server/database/test_config";
import { processPgDump } from "@oko-wallet-ksn-server/pg_dump/dump";
import { startPgDumpRuntime } from "@oko-wallet-ksn-server/pg_dump/runtime";

describe("pg_dump_runtime_test", () => {
  const dumpDir = join(os.homedir(), "oko_data");

  let pool: Pool;

  beforeAll(async () => {
    const config = testPgConfig;
    const createPostgresRes = await connectPG({
      database: config.database,
      host: config.host,
      password: config.password,
      user: config.user,
      port: config.port,
      ssl: config.ssl,
    });

    if (createPostgresRes.success === false) {
      console.error(createPostgresRes.err);
      throw new Error("Failed to create postgres database");
    }

    pool = createPostgresRes.data;
  });

  beforeEach(async () => {
    await resetPgDatabase(pool);
  });

  describe("startPgDumpRuntime", () => {
    const mockPgConfig = {
      database: testPgConfig.database,
      host: testPgConfig.host,
      port: testPgConfig.port,
      user: testPgConfig.user,
      password: testPgConfig.password,
    };

    it("should run complete runtime workflow with multiple scenarios", async () => {
      const dump1Res = await processPgDump(pool, mockPgConfig, dumpDir);
      if (dump1Res.success === false) {
        throw new Error(`processPgDump failed: ${dump1Res.err}`);
      }
      const dump1 = dump1Res.data;

      const dump2Res = await processPgDump(pool, mockPgConfig, dumpDir);
      if (dump2Res.success === false) {
        throw new Error(`processPgDump failed: ${dump2Res.err}`);
      }
      const dump2 = dump2Res.data;

      const dump3Res = await processPgDump(pool, mockPgConfig, dumpDir);
      if (dump3Res.success === false) {
        throw new Error(`processPgDump failed: ${dump3Res.err}`);
      }
      const dump3 = dump3Res.data;

      const initialDumpIds = [dump1.dumpId, dump2.dumpId, dump3.dumpId];

      // update dump created_at to 2 days ago
      await pool.query(
        `
        UPDATE pg_dumps 
        SET created_at = created_at - INTERVAL '2 days'
        WHERE dump_id IN (${initialDumpIds.map((_, i) => `$${i + 1}`).join(", ")})
      `,
        initialDumpIds,
      );

      // check if old dumps are set correctly
      const oldDumps = await getAllPgDumps(pool);
      expect(oldDumps.success).toBe(true);
      if (oldDumps.success === false) {
        throw new Error(`getAllPgDumps failed: ${oldDumps.err}`);
      }

      const oldCompletedDumps = oldDumps.data.filter(
        (dump) =>
          dump.status === "COMPLETED" && initialDumpIds.includes(dump.dump_id),
      );
      expect(oldCompletedDumps.length).toBe(3);

      // start runtime (1 day retention)
      const runtimeOptions = {
        dumpDir,
        sleepTimeSeconds: 1,
        retentionDays: 1,
      };

      startPgDumpRuntime(pool, mockPgConfig, runtimeOptions);

      // wait for 3 seconds
      await new Promise((resolve) => setTimeout(resolve, 3500));

      // check if new dumps are created
      const allDumps = await getAllPgDumps(pool);
      expect(allDumps.success).toBe(true);
      if (allDumps.success === false) {
        throw new Error(`getAllPgDumps failed: ${allDumps.err}`);
      }

      // check if new dumps are created
      const newCompletedDumps = allDumps.data.filter(
        (dump) =>
          dump.status === "COMPLETED" && !initialDumpIds.includes(dump.dump_id),
      );
      expect(newCompletedDumps.length).toBeGreaterThanOrEqual(2);

      // check if new dumps are created
      for (const dump of newCompletedDumps) {
        if (dump.dump_path) {
          const fileExists = await fs
            .access(dump.dump_path)
            .then(() => true)
            .catch(() => false);
          expect(fileExists).toBe(true);

          const fileBuffer = await fs.readFile(dump.dump_path);
          expect(fileBuffer.toString("ascii", 0, 5)).toBe("PGDMP");
        }
      }

      // check if old dumps are deleted
      const deletedDumps = allDumps.data.filter(
        (dump) =>
          dump.status === "DELETED" && initialDumpIds.includes(dump.dump_id),
      );
      expect(deletedDumps.length).toBe(3);

      // check if deleted dumps are deleted
      for (const dump of deletedDumps) {
        if (dump.dump_path) {
          const fileExists = await fs
            .access(dump.dump_path)
            .then(() => true)
            .catch(() => false);
          expect(fileExists).toBe(false);
        }
      }

      // check if total dump count is correct
      expect(allDumps.data.length).toBeGreaterThanOrEqual(5);
    }, 15000);
  });
});
