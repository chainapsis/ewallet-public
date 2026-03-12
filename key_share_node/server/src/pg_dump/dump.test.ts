import fs from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import {
  getAllPgDumps,
  getPgDumpById,
  type PgDumpConfig,
} from "@oko-wallet/ksn-pg-interface";
import type { Pool } from "pg";

import { connectPG, resetPgDatabase } from "@oko-wallet-ksn-server/database";
import { testPgConfig } from "@oko-wallet-ksn-server/database/test_config";
import {
  deleteOldPgDumps,
  processPgDump,
} from "@oko-wallet-ksn-server/pg_dump/dump";

describe("pg_dump_test", () => {
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

  describe("processPgDump", () => {
    const mockPgConfig: PgDumpConfig = {
      database: testPgConfig.database,
      host: testPgConfig.host,
      port: testPgConfig.port,
      user: testPgConfig.user,
      password: testPgConfig.password,
    };

    it("should successfully create pg dump and save to database", async () => {
      const result = await processPgDump(pool, mockPgConfig, dumpDir);

      expect(result.success).toBe(true);
      if (result.success === false) {
        throw new Error(`processPgDump failed: ${result.err}`);
      }

      expect(result.data.dumpId).toBeDefined();
      expect(result.data.dumpPath).toBeDefined();
      expect(result.data.dumpSize).toBeGreaterThan(0);
      expect(result.data.dumpDuration).toBeGreaterThanOrEqual(0);

      const fileExists = await fs
        .access(result.data.dumpPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      const stats = await fs.stat(result.data.dumpPath);
      expect(stats.size).toBe(result.data.dumpSize);

      const getDumpRes = await getPgDumpById(pool, result.data.dumpId);
      if (getDumpRes.success === false) {
        throw new Error(`getPgDumpById failed: ${getDumpRes.err}`);
      }
      const dump = getDumpRes.data;
      expect(dump?.status).toBe("COMPLETED");
      expect(dump?.dump_path).toBe(result.data.dumpPath);
      expect(dump?.meta.dump_size).toBe(result.data.dumpSize);
      expect(dump?.meta.dump_duration).toBe(result.data.dumpDuration);
    });

    it("should fail with invalid database configuration", async () => {
      const invalidConfig: PgDumpConfig = {
        database: "non_existent_db",
        host: testPgConfig.host,
        port: testPgConfig.port,
        user: testPgConfig.user,
        password: testPgConfig.password,
      };

      const result = await processPgDump(pool, invalidConfig, dumpDir);

      expect(result.success).toBe(false);
      if (result.success === true) {
        throw new Error(`processPgDump should fail: ${result.data}`);
      }

      const getAllPgDumpsRes = await getAllPgDumps(pool);
      if (getAllPgDumpsRes.success === false) {
        throw new Error(`getAllPgDumps failed: ${getAllPgDumpsRes.err}`);
      }
      expect(getAllPgDumpsRes.data.length).toBe(1);
      expect(getAllPgDumpsRes.data[0].status).toBe("FAILED");
      expect(getAllPgDumpsRes.data[0].dump_path).toBeNull();
      expect(getAllPgDumpsRes.data[0].meta.dump_size).toBeUndefined();
      expect(getAllPgDumpsRes.data[0].meta.dump_duration).toBeUndefined();
    });
  });

  describe("deleteOldPgDumps", () => {
    const mockPgConfig: PgDumpConfig = {
      database: testPgConfig.database,
      host: testPgConfig.host,
      port: testPgConfig.port,
      user: testPgConfig.user,
      password: testPgConfig.password,
    };

    it("should delete old dumps based on retention days", async () => {
      const result1 = await processPgDump(pool, mockPgConfig, dumpDir);
      expect(result1.success).toBe(true);

      const result2 = await processPgDump(pool, mockPgConfig, dumpDir);
      expect(result2.success).toBe(true);

      // update the created_at to simulate old dumps
      await pool.query(`
         UPDATE pg_dumps 
         SET created_at = created_at - INTERVAL '2 days'
         WHERE status = 'COMPLETED'
       `);

      const deleteResult = await deleteOldPgDumps(pool, 1);

      expect(deleteResult.success).toBe(true);
      if (deleteResult.success === false) {
        throw new Error(`deleteOldPgDumps failed: ${deleteResult.err}`);
      }

      expect(deleteResult.data).toBeGreaterThanOrEqual(2);
      console.log(`Deleted ${deleteResult.data} old dumps`);

      const getAllPgDumpsRes = await getAllPgDumps(pool);
      if (getAllPgDumpsRes.success === false) {
        throw new Error(`getAllPgDumps failed: ${getAllPgDumpsRes.err}`);
      }

      const deletedDumps = getAllPgDumpsRes.data.filter(
        (dump) => dump.status === "DELETED",
      );
      expect(deletedDumps.length).toBeGreaterThanOrEqual(2);

      for (const deletedDump of deletedDumps) {
        if (deletedDump.dump_path) {
          const fileExists = await fs
            .access(deletedDump.dump_path)
            .then(() => true)
            .catch(() => false);
          expect(fileExists).toBe(false);
        }
      }
    });

    it("should not delete recent dumps", async () => {
      const result = await processPgDump(pool, mockPgConfig, dumpDir);
      expect(result.success).toBe(true);

      const deleteResult = await deleteOldPgDumps(pool, 30);

      expect(deleteResult.success).toBe(true);
      if (deleteResult.success === false) {
        throw new Error(`deleteOldPgDumps failed: ${deleteResult.err}`);
      }

      expect(deleteResult.data).toBe(0);

      const getAllPgDumpsRes = await getAllPgDumps(pool);
      if (getAllPgDumpsRes.success === false) {
        throw new Error(`getAllPgDumps failed: ${getAllPgDumpsRes.err}`);
      }

      const completedDumps = getAllPgDumpsRes.data.filter(
        (dump) => dump.status === "COMPLETED",
      );
      expect(completedDumps.length).toBeGreaterThanOrEqual(1);

      for (const completedDump of completedDumps) {
        if (completedDump.dump_path) {
          const fileExists = await fs
            .access(completedDump.dump_path)
            .then(() => true)
            .catch(() => false);
          expect(fileExists).toBe(true);
        }
      }
    });

    it("should handle file deletion errors gracefully", async () => {
      const result = await processPgDump(pool, mockPgConfig, dumpDir);
      expect(result.success).toBe(true);

      await pool.query(`
         UPDATE pg_dumps 
         SET created_at = created_at - INTERVAL '2 days'
         WHERE status = 'COMPLETED'
       `);

      // delete the file to simulate file deletion error
      if (result.success === true) {
        await fs.unlink(result.data.dumpPath);
      }

      const deleteResult = await deleteOldPgDumps(pool, 1);

      expect(deleteResult.success).toBe(true);
      if (deleteResult.success === false) {
        throw new Error(`deleteOldPgDumps failed: ${deleteResult.err}`);
      }

      expect(deleteResult.data).toBeGreaterThanOrEqual(1);

      const getAllPgDumpsRes = await getAllPgDumps(pool);
      if (getAllPgDumpsRes.success === false) {
        throw new Error(`getAllPgDumps failed: ${getAllPgDumpsRes.err}`);
      }

      const deletedDumps = getAllPgDumpsRes.data.filter(
        (dump) => dump.status === "DELETED",
      );
      expect(deletedDumps.length).toBeGreaterThanOrEqual(1);
    });
  });
});
