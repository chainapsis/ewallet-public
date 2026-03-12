import { dump, restore } from "@oko-wallet/ksn-pg-interface";
import type { Result } from "@oko-wallet/stdlib-js";
import type { Pool } from "pg";

import {
  connectPG,
  type PgDatabaseConfig,
} from "@oko-wallet-ksn-server/database";

const DUMP_TEST_DB = "dump_test_db";
const RESTORE_TEST_DB = "restore_test_db";

export type CheckDBBackupError =
  | {
      type: "connect_db_fail";
      error: string;
    }
  | {
      type: "dump_fail";
      error: string;
    }
  | {
      type: "restore_fail";
      error: string;
    }
  | {
      type: "restored_data_mismatch";
      error: string;
    };

export async function checkDBBackup(
  pgConfig: PgDatabaseConfig,
  dumpDir: string,
): Promise<Result<void, CheckDBBackupError>> {
  let dumpPool: Pool | null = null;
  let masterPool: Pool | null = null;
  let restorePool: Pool | null = null;

  try {
    const masterPoolRes = await connectPG({
      ...pgConfig,
      database: "postgres",
    });
    if (masterPoolRes.success === false) {
      return {
        success: false,
        err: {
          type: "connect_db_fail",
          error: `Failed to create master pool: ${masterPoolRes.err}`,
        },
      };
    }
    masterPool = masterPoolRes.data;

    const { rows: existingDumpDbs } = await masterPool.query(
      `
SELECT 1 FROM pg_database 
WHERE datname = $1
`,
      [DUMP_TEST_DB],
    );
    if (existingDumpDbs.length === 0) {
      await masterPool.query(`CREATE DATABASE "${DUMP_TEST_DB}"`);
    }

    const dumpPoolRes = await connectPG({
      ...pgConfig,
      database: DUMP_TEST_DB,
    });
    if (dumpPoolRes.success === false) {
      return {
        success: false,
        err: { type: "connect_db_fail", error: dumpPoolRes.err },
      };
    }
    dumpPool = dumpPoolRes.data;

    await dumpPool.query(`
CREATE TABLE IF NOT EXISTS test_table (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL
)
`);

    const testData = [{ email: "test1@test.com" }, { email: "test2@test.com" }];

    await dumpPool.query(
      `
INSERT INTO test_table (email) 
VALUES ($1), ($2)
`,
      testData.map((d) => d.email),
    );

    const dumpRes = await dump(
      { ...pgConfig, database: DUMP_TEST_DB },
      dumpDir,
    );
    if (!dumpRes.success) {
      return {
        success: false,
        err: {
          type: "dump_fail",
          error: `Failed to dump database: ${dumpRes.err}`,
        },
      };
    }

    const { rows: existingRestoreDbs } = await masterPool.query(
      `
SELECT 1 FROM pg_database 
WHERE datname = $1
`,
      [RESTORE_TEST_DB],
    );
    if (existingRestoreDbs.length === 0) {
      await masterPool.query(`CREATE DATABASE "${RESTORE_TEST_DB}"`);
    }

    const restoreRes = await restore(
      { ...pgConfig, database: RESTORE_TEST_DB },
      dumpRes.data.dumpPath,
    );
    if (restoreRes.success === false) {
      return {
        success: false,
        err: {
          type: "restore_fail",
          error: `Failed to restore database: ${restoreRes.err}`,
        },
      };
    }

    const restorePoolRes = await connectPG({
      ...pgConfig,
      database: RESTORE_TEST_DB,
    });
    if (restorePoolRes.success === false) {
      return {
        success: false,
        err: {
          type: "connect_db_fail",
          error: `Failed to create restore pool: ${restorePoolRes.err}`,
        },
      };
    }
    restorePool = restorePoolRes.data;

    const { rows: result } = await restorePool.query(`
SELECT email FROM test_table 
ORDER BY id
`);

    if (result.length !== 2) {
      return {
        success: false,
        err: {
          type: "restored_data_mismatch",
          error: `Failed to restore database, result len: ${result.length}, expected: 2`,
        },
      };
    }

    const expectedEmails = testData.map((d) => d.email);
    const actualEmails = result.map((row) => row.email);
    if (!expectedEmails.every((email) => actualEmails.includes(email))) {
      return {
        success: false,
        err: {
          type: "restored_data_mismatch",
          error: `Data mismatch. Expected: ${expectedEmails.join(", ")}, Got: ${actualEmails.join(", ")}`,
        },
      };
    }

    return { success: true, data: void 0 };
  } finally {
    if (restorePool) {
      await restorePool.end();
    }

    if (dumpPool) {
      await dumpPool.end();
    }

    if (masterPool) {
      const { rows: existingRestoreDbs } = await masterPool.query(
        `
SELECT 1 FROM pg_database 
WHERE datname = $1
`,
        [RESTORE_TEST_DB],
      );
      if (existingRestoreDbs.length > 0) {
        await masterPool.query(`
DROP DATABASE "${RESTORE_TEST_DB}"
`);
      }

      const { rows: existingDumpDbs } = await masterPool.query(
        `
SELECT 1 FROM pg_database 
WHERE datname = $1
`,
        [DUMP_TEST_DB],
      );
      if (existingDumpDbs.length > 0) {
        await masterPool.query(`
DROP DATABASE "${DUMP_TEST_DB}"
`);
      }

      await masterPool.end();
    }
  }
}
