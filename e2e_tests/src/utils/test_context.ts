import { Pool } from "pg";
import { Bytes } from "@oko-wallet/bytes";
import type { Application } from "express";
import type { Server } from "http";

import {
  okoApiDbConfig,
  createKsnDbConfig,
  resetDatabase,
  ensureDatabaseExists,
  initializeOkoApiSchema,
  initializeKsnSchema,
  seedOkoApiTestData,
} from "@e2e/setup/database";
import { createOkoApiApp } from "@e2e/setup/oko_api";
import { createKsnApp } from "@e2e/setup/ksn";
import { OKO_API_KEYPAIR, KSN_KEYPAIRS } from "./keys";

const KSN_BASE_PORT = 13001;

export interface TestContext {
  okoApiPool: Pool;
  okoApiApp: Application;
  ksnPools: Pool[];
  ksnApps: Application[];
  ksnServers: Server[];
  ksnUrls: string[];
  cleanup: () => Promise<void>;
  resetAllDatabases: () => Promise<void>;
}

export async function createTestContext(
  opts?: { ksnCount?: number },
): Promise<TestContext> {
  // Ensure all databases exist
  await ensureDatabaseExists(okoApiDbConfig);
  const targetKsnCount = opts?.ksnCount ?? KSN_KEYPAIRS.length;

  // Build keypairs array up to targetKsnCount
  const ksnKeypairs = [...KSN_KEYPAIRS];
  if (ksnKeypairs.length < targetKsnCount) {
    for (let i = ksnKeypairs.length; i < targetKsnCount; i++) {
      const hexChar = ((i + 1) % 16).toString(16);
      const privHex = hexChar.repeat(64);
      const pubHex = (i % 2 === 0 ? "a" : "b").repeat(64);
      const privRes = Bytes.fromHexString(privHex, 32);
      const pubRes = Bytes.fromHexString(pubHex, 32);
      if (!privRes.success || !pubRes.success) {
        throw new Error("Failed to synthesize KSN keypair");
      }
      ksnKeypairs.push({ privateKey: privRes.data, publicKey: pubRes.data });
    }
  }

  for (let i = 0; i < targetKsnCount; i++) {
    await ensureDatabaseExists(createKsnDbConfig(i + 1));
  }

  const okoApiPool = new Pool(okoApiDbConfig);
  const ksnPools = Array.from({ length: targetKsnCount }, (_, i) =>
    new Pool(createKsnDbConfig(i + 1)),
  );

  // Initialize schemas
  await initializeOkoApiSchema(okoApiPool);
  for (const ksnPool of ksnPools) {
    await initializeKsnSchema(ksnPool);
  }

  const okoApiApp = createOkoApiApp(okoApiPool, OKO_API_KEYPAIR);
  const ksnApps = ksnPools.map((pool, i) => createKsnApp(pool, ksnKeypairs[i]));

  // Start KSN HTTP servers
  const ksnServers: Server[] = [];
  const ksnUrls: string[] = [];

  for (let i = 0; i < ksnApps.length; i++) {
    const port = KSN_BASE_PORT + i;
    const server = ksnApps[i].listen(port);
    ksnServers.push(server);
    ksnUrls.push(`http://localhost:${port}`);
  }

  // Seed oko_api with correct KSN URLs
  await seedOkoApiTestData(okoApiPool, ksnUrls);

  const cleanup = async () => {
    // Close KSN servers
    await Promise.all(
      ksnServers.map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
    );
    await okoApiPool.end();
    await Promise.all(ksnPools.map((pool) => pool.end()));
  };

  const resetAllDatabases = async () => {
    await resetDatabase(okoApiPool);
    await seedOkoApiTestData(okoApiPool, ksnUrls);
    await Promise.all(ksnPools.map((pool) => resetDatabase(pool)));
  };

  return {
    okoApiPool,
    okoApiApp,
    ksnPools,
    ksnApps,
    ksnServers,
    ksnUrls,
    cleanup,
    resetAllDatabases,
  };
}
