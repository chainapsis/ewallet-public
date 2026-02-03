import { Pool } from "pg";
import type { Application } from "express";

import {
  okoApiDbConfig,
  createKsnDbConfig,
  resetDatabase,
} from "@e2e/setup/database";
import { createOkoApiApp } from "@e2e/setup/oko_api";
import { createKsnApp } from "@e2e/setup/ksn";
import { OKO_API_KEYPAIR, KSN_KEYPAIRS } from "./keys";

export interface TestContext {
  okoApiPool: Pool;
  okoApiApp: Application;
  ksnPools: Pool[];
  ksnApps: Application[];
  cleanup: () => Promise<void>;
  resetAllDatabases: () => Promise<void>;
}

export async function createTestContext(): Promise<TestContext> {
  const okoApiPool = new Pool(okoApiDbConfig);
  const ksnPools = KSN_KEYPAIRS.map(
    (_, i) => new Pool(createKsnDbConfig(i + 1)),
  );

  const okoApiApp = createOkoApiApp(okoApiPool, OKO_API_KEYPAIR);
  const ksnApps = ksnPools.map((pool, i) =>
    createKsnApp(pool, KSN_KEYPAIRS[i]),
  );

  const cleanup = async () => {
    await okoApiPool.end();
    await Promise.all(ksnPools.map((pool) => pool.end()));
  };

  const resetAllDatabases = async () => {
    await resetDatabase(okoApiPool);
    await Promise.all(ksnPools.map((pool) => resetDatabase(pool)));
  };

  return {
    okoApiPool,
    okoApiApp,
    ksnPools,
    ksnApps,
    cleanup,
    resetAllDatabases,
  };
}
