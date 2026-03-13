import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { join } from "node:path";
import type { Result } from "@oko-wallet/stdlib-js";
import { replaceTildeWithHome } from "@oko-wallet/stdlib-js/path";

export interface PgDumpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface PgDumpResult {
  dumpPath: string;
  dumpSize: number;
}

export async function dump(
  pgConfig: PgDumpConfig,
  _dumpDir: string,
): Promise<Result<PgDumpResult, string>> {
  try {
    const dumpDir = replaceTildeWithHome(_dumpDir);

    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir, { recursive: true });

      console.log("Created dump dir, path: %s", dumpDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dumpFile = `${pgConfig.database}_${timestamp}.dump`;
    const dumpPath = join(dumpDir, dumpFile);

    const command = "pg_dump";
    const args = [
      "-h",
      pgConfig.host,
      "-p",
      String(pgConfig.port),
      "-U",
      pgConfig.user,
      "-d",
      pgConfig.database,
      "-Fc",
      "-f",
      dumpPath,
    ];

    console.log("Executing %s %s", command, args.join(" "));

    const res = spawnSync(command, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        PGPASSWORD: pgConfig.password,
      },
    });

    if (res.error) {
      console.error("Error dumping, err: %s", res.error);
      return { success: false, err: String(res.error) };
    }

    const stats = fs.statSync(dumpPath);
    const dumpSize = stats.size;

    console.log("Finished dump, path: %s, dumpSize: %s", dumpPath, dumpSize);

    return { success: true, data: { dumpPath, dumpSize } };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}

export async function restore(
  pgConfig: PgDumpConfig,
  dumpPath: string,
): Promise<Result<void, string>> {
  try {
    const result = spawnSync(
      "pg_restore",
      [
        "-h",
        pgConfig.host,
        "-p",
        String(pgConfig.port),
        "-U",
        pgConfig.user,
        "-d",
        pgConfig.database,
        "--clean",
        "--if-exists",
        "--verbose",
        dumpPath,
      ],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          PGPASSWORD: pgConfig.password,
        },
      },
    );

    if (result.error) {
      return { success: false, err: String(result.error) };
    }

    if (result.status !== 0) {
      const errorMsg = result.stderr
        ? result.stderr.toString()
        : `pg_restore failed with exit code ${result.status}`;
      return { success: false, err: errorMsg };
    }

    console.log("Finished pg_restore");

    return { success: true, data: void 0 };
  } catch (error) {
    return { success: false, err: String(error) };
  }
}
