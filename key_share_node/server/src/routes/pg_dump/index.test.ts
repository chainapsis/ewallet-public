import os from "node:os";
import { join } from "node:path";
import { Bytes } from "@oko-wallet/bytes";
import dayjs from "dayjs";
import express from "express";
import type { Pool } from "pg";
import request from "supertest";

import { makePgDumpRouter } from ".";
import { connectPG, resetPgDatabase } from "@oko-wallet-ksn-server/database";
import { testPgConfig } from "@oko-wallet-ksn-server/database/test_config";
import type { ServerState } from "@oko-wallet-ksn-server/state";

// Mock keypair for testing
const privateKeyRes = Bytes.fromHexString(
  "0000000000000000000000000000000000000000000000000000000000000001",
  32,
);
const publicKeyRes = Bytes.fromHexString(
  "0000000000000000000000000000000000000000000000000000000000000002",
  32,
);
if (!privateKeyRes.success || !publicKeyRes.success) {
  throw new Error("Failed to create mock keypair");
}
const mockServerKeypair = {
  privateKey: privateKeyRes.data,
  publicKey: publicKeyRes.data,
};

function _makeUnsuccessfulAppStatus(pool: Pool): ServerState {
  return {
    db: pool,
    encryptionSecret: "temp_enc_secret",
    serverKeypair: mockServerKeypair,
    telegram_bot_token: "temp_telegram_bot_token",
    is_db_backup_checked: false,
    launch_time: dayjs().toISOString(),
    git_hash: "",
    version: "",
  };
}

describe("pg_dump_route_test", () => {
  const testAdminPassword = "test_admin_password";
  const dumpDir = join(os.homedir(), "oko_data");

  let pool: Pool;
  let app: express.Application;

  beforeAll(async () => {
    process.env = {
      ...process.env,
      ADMIN_PASSWORD: testAdminPassword,
      DB_NAME: testPgConfig.database,
      DB_HOST: testPgConfig.host,
      DB_PASSWORD: testPgConfig.password,
      DB_USER: testPgConfig.user,
      DB_PORT: testPgConfig.port.toString(),
      DUMP_DIR: dumpDir,
    };

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

    app = express();
    app.use(express.json());

    const pgDumpRouter = makePgDumpRouter();
    app.use("/pg_dump/v1", pgDumpRouter);

    app.locals = {
      db: pool,
      encryptionSecret: "temp_enc_secret",
      serverKeypair: mockServerKeypair,
      telegram_bot_token: "temp_telegram_bot_token",
      is_db_backup_checked: false,
      launch_time: dayjs().toISOString(),
      git_hash: "",
      version: "",
    };
  });

  beforeEach(async () => {
    process.env.ADMIN_PASSWORD = testAdminPassword;
    process.env.DB_NAME = testPgConfig.database;
    process.env.DB_HOST = testPgConfig.host;
    process.env.DB_PASSWORD = testPgConfig.password;
    process.env.DB_USER = testPgConfig.user;
    process.env.DB_PORT = testPgConfig.port.toString();
    process.env.DUMP_DIR = dumpDir;

    await resetPgDatabase(pool);
  });

  // describe("POST /pg_dump/v1/backup", () => {
  //   it("should successfully create pg dump with valid password", async () => {
  //     const response = await request(app)
  //       .post("/pg_dump/v1/backup")
  //       .send({ password: testAdminPassword })
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //     expect(response.body.data).toBeDefined();
  //     expect(response.body.data.dumpId).toBeDefined();
  //     expect(response.body.data.dumpPath).toBeDefined();
  //     expect(response.body.data.dumpSize).toBeGreaterThan(0);
  //     expect(response.body.data.dumpDuration).toBeGreaterThanOrEqual(0);

  //     const dbDump = await getPgDumpById(pool, response.body.data.dumpId);
  //     expect(dbDump.success).toBe(true);
  //     if (dbDump.success === false) {
  //       throw new Error(`getPgDumpById failed: ${dbDump.err}`);
  //     }
  //     expect(dbDump.data?.status).toBe("COMPLETED");
  //     expect(dbDump.data?.dump_path).toBe(response.body.data.dumpPath);
  //     expect(dbDump.data?.meta.dump_size).toBe(response.body.data.dumpSize);
  //     expect(dbDump.data?.meta.dump_duration).toBe(
  //       response.body.data.dumpDuration,
  //     );

  //     const fileExists = await fs
  //       .access(response.body.data.dumpPath)
  //       .then(() => true)
  //       .catch(() => false);
  //     expect(fileExists).toBe(true);

  //     const stats = await fs.stat(response.body.data.dumpPath);
  //     expect(stats.size).toBe(response.body.data.dumpSize);

  //     const fileBuffer = await fs.readFile(response.body.data.dumpPath);
  //     expect(fileBuffer.toString("ascii", 0, 5)).toBe("PGDMP");
  //   });

  //   it("should fail with invalid password", async () => {
  //     const response = await request(app)
  //       .post("/pg_dump/v1/backup")
  //       .send({ password: "wrong_password" })
  //       .expect(401);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("UNAUTHORIZED");
  //     expect(response.body.msg).toBe("Invalid admin password");
  //   });

  //   it("should fail with missing password", async () => {
  //     const response = await request(app)
  //       .post("/pg_dump/v1/backup")
  //       .send({})
  //       .expect(401);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("UNAUTHORIZED");
  //     expect(response.body.msg).toBe("Admin password is required");
  //   });

  //   it("should fail with empty password", async () => {
  //     const response = await request(app)
  //       .post("/pg_dump/v1/backup")
  //       .send({ password: "" })
  //       .expect(401);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("UNAUTHORIZED");
  //     expect(response.body.msg).toBe("Admin password is required");
  //   });

  //   it("should handle database configuration errors", async () => {
  //     const originalDbName = process.env.DB_NAME;
  //     process.env.DB_NAME = "non_existent_db";

  //     const invalidApp = express();
  //     invalidApp.use(express.json());

  //     const pgDumpRouter = makePgDumpRouter();
  //     invalidApp.use("/pg_dump/v1", pgDumpRouter);

  //     invalidApp.locals = makeUnsuccessfulAppStatus(pool);

  //     const response = await request(invalidApp)
  //       .post("/pg_dump/v1/backup")
  //       .send({ password: testAdminPassword })
  //       .expect(500);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("PG_DUMP_FAILED");
  //     expect(response.body.msg).toContain("database");

  //     const allDumps = await getAllPgDumps(pool);
  //     expect(allDumps.success).toBe(true);
  //     if (allDumps.success === false) {
  //       throw new Error(`getAllPgDumps failed: ${allDumps.err}`);
  //     }

  //     const failedDumps = allDumps.data.filter(
  //       (dump) => dump.status === "FAILED",
  //     );
  //     expect(failedDumps.length).toBe(1);
  //     expect(failedDumps[0].dump_path).toBeNull();
  //     expect(failedDumps[0].meta.error).toContain("database");

  //     process.env.DB_NAME = originalDbName;
  //   });

  //   it("should handle authentication errors", async () => {
  //     const invalidApp = express();
  //     invalidApp.use(express.json());

  //     const pgDumpRouter = makePgDumpRouter();
  //     invalidApp.use("/pg_dump/v1", pgDumpRouter);

  //     process.env.DB_PASSWORD = "wrong_password";

  //     invalidApp.locals = makeUnsuccessfulAppStatus(pool);

  //     const response = await request(invalidApp)
  //       .post("/pg_dump/v1/backup")
  //       .send({ password: testAdminPassword })
  //       .expect(500);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("PG_DUMP_FAILED");
  //     expect(response.body.msg).toContain("authentication");

  //     const allDumps = await getAllPgDumps(pool);
  //     expect(allDumps.success).toBe(true);
  //     if (allDumps.success === false) {
  //       throw new Error(`getAllPgDumps failed: ${allDumps.err}`);
  //     }

  //     const failedDumps = allDumps.data.filter(
  //       (dump) => dump.status === "FAILED",
  //     );
  //     expect(failedDumps.length).toBe(1);
  //     expect(failedDumps[0].dump_path).toBeNull();
  //     expect(failedDumps[0].meta.error).toContain("authentication");
  //   });

  //   it("should handle multiple concurrent requests", async () => {
  //     const promises = Array.from({ length: 3 }, () =>
  //       request(app)
  //         .post("/pg_dump/v1/backup")
  //         .send({ password: testAdminPassword })
  //         .expect(200),
  //     );

  //     const responses = await Promise.all(promises);

  //     responses.forEach((response) => {
  //       expect(response.body.success).toBe(true);
  //       expect(response.body.data.dumpId).toBeDefined();
  //       expect(response.body.data.dumpPath).toBeDefined();
  //     });

  //     const dumpIds = responses.map((r) => r.body.data.dumpId);
  //     const uniqueDumpIds = new Set(dumpIds);
  //     expect(uniqueDumpIds.size).toBe(3);

  //     for (const response of responses) {
  //       const dbDump = await getPgDumpById(pool, response.body.data.dumpId);
  //       expect(dbDump.success).toBe(true);
  //       if (dbDump.success) {
  //         expect(dbDump.data?.status).toBe("COMPLETED");
  //         expect(dbDump.data?.dump_path).toBe(response.body.data.dumpPath);
  //       }

  //       const fileExists = await fs
  //         .access(response.body.data.dumpPath)
  //         .then(() => true)
  //         .catch(() => false);
  //       expect(fileExists).toBe(true);

  //       const fileBuffer = await fs.readFile(response.body.data.dumpPath);
  //       expect(fileBuffer.toString("ascii", 0, 5)).toBe("PGDMP");
  //     }
  //   });
  // });

  describe("POST /pg_dump/v1/get_backup_history", () => {
    const createDump = async () => {
      const response = await request(app)
        .post("/pg_dump/v1/backup")
        .send({ password: testAdminPassword })
        .expect(200);
      return response.body.data;
    };

    it("should return all dumps when no days parameter is \
      provided", async () => {
      const dump1 = await createDump();
      const dump2 = await createDump();

      const response = await request(app)
        .post("/pg_dump/v1/get_backup_history")
        .send({ password: testAdminPassword })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      const dumpIds = response.body.data.map((dump: any) => dump.dump_id);
      expect(dumpIds).toContain(dump1.dumpId);
      expect(dumpIds).toContain(dump2.dumpId);

      const firstDump = response.body.data[0];
      expect(firstDump.dump_id).toBeDefined();
      expect(firstDump.status).toBeDefined();
      expect(firstDump.dump_path).toBeDefined();
      expect(firstDump.meta).toBeDefined();
      expect(firstDump.created_at).toBeDefined();
      expect(firstDump.updated_at).toBeDefined();
    });

    it("should return dumps for specified number of days", async () => {
      const dump = await createDump();

      const response = await request(app)
        .post("/pg_dump/v1/get_backup_history")
        .send({ password: testAdminPassword, days: 7 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);

      const dumpIds = response.body.data.map((d: any) => d.dump_id);
      expect(dumpIds).toContain(dump.dumpId);
    });

    it("should return empty array when no dumps exist", async () => {
      const response = await request(app)
        .post("/pg_dump/v1/get_backup_history")
        .send({ password: testAdminPassword })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it("should handle database errors gracefully", async () => {
      // Create an app with invalid database connection
      const invalidApp = express();
      invalidApp.use(express.json());

      const pgDumpRouter = makePgDumpRouter();
      invalidApp.use("/pg_dump/v1", pgDumpRouter);

      invalidApp.locals = {
        db: null as any, // Invalid database connection
        encryptionSecret: "temp_enc_secret",
        serverKeypair: mockServerKeypair,
        telegram_bot_token: "temp_telegram_bot_token",
        is_db_backup_checked: false,
        launch_time: dayjs().toISOString(),
        git_hash: "",
        version: "",
      };

      const response = await request(invalidApp)
        .post("/pg_dump/v1/get_backup_history")
        .send({ password: testAdminPassword })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe("UNKNOWN_ERROR");
      expect(response.body.msg).toBeDefined();
    });

    it("should return dumps ordered by created_at DESC", async () => {
      const dump1 = await createDump();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const dump2 = await createDump();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const dump3 = await createDump();

      const response = await request(app)
        .post("/pg_dump/v1/get_backup_history")
        .send({ password: testAdminPassword })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);

      const dumpIds = response.body.data.map((d: any) => d.dump_id);
      const expectedOrder = [dump3.dumpId, dump2.dumpId, dump1.dumpId];

      for (let i = 0; i < expectedOrder.length; i++) {
        expect(dumpIds[i]).toBe(expectedOrder[i]);
      }
    });

    it("should filter dumps by days correctly", async () => {
      const recentDump = await createDump();
      const oldDump = await createDump();

      // Update the old dump's created_at to be 2 days ago
      await pool.query(
        `
UPDATE pg_dumps
SET created_at = created_at - INTERVAL '2 days'
WHERE dump_id = $1`,
        [oldDump.dumpId],
      );

      const response = await request(app)
        .post("/pg_dump/v1/get_backup_history")
        .send({ password: testAdminPassword, days: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify only recent dump is in the response
      const dumpIds = response.body.data.map((d: any) => d.dump_id);
      expect(dumpIds).toContain(recentDump.dumpId);
      expect(dumpIds).not.toContain(oldDump.dumpId);

      // Get dumps for last 3 days (should include both dumps)
      const response2 = await request(app)
        .post("/pg_dump/v1/get_backup_history")
        .send({ password: testAdminPassword, days: 3 })
        .expect(200);

      expect(response2.body.success).toBe(true);
      const dumpIds2 = response2.body.data.map((d: any) => d.dump_id);
      expect(dumpIds2).toContain(recentDump.dumpId);
      expect(dumpIds2).toContain(oldDump.dumpId);
    });
  });

  // describe("POST /pg_dump/v1/restore", () => {
  //   const createDump = async () => {
  //     const response = await request(app)
  //       .post("/pg_dump/v1/backup")
  //       .send({ password: testAdminPassword })
  //       .expect(200);
  //     return response.body.data;
  //   };

  //   it("should successfully restore pg dump with valid dump_path and password", async () => {
  //     // Create test users using createUser function
  //     const testEmails = [
  //       "user1@test.com",
  //       "user2@test.com",
  //       "user3@test.com",
  //       "user4@test.com",
  //       "user5@test.com",
  //     ];

  //     const createdUsers = [];
  //     for (const email of testEmails) {
  //       const createUserRes = await createUser(pool, email, "google");
  //       expect(createUserRes.success).toBe(true);
  //       if (createUserRes.success) {
  //         createdUsers.push(createUserRes.data);
  //       }
  //     }

  //     for (const email of testEmails) {
  //       const getUserRes = await getUserByEmailAndAuthType(
  //         pool,
  //         email,
  //         "google",
  //       );
  //       expect(getUserRes.success).toBe(true);
  //       if (getUserRes.success) {
  //         expect(getUserRes.data).not.toBeNull();
  //         if (getUserRes.data) {
  //           expect(getUserRes.data.email).toBe(email);
  //         }
  //       }
  //     }

  //     // Create dump
  //     const dump = await createDump();

  //     // Reset database to simulate data loss
  //     await resetPgDatabase(pool);

  //     for (const email of testEmails) {
  //       const getUserRes = await getUserByEmailAndAuthType(
  //         pool,
  //         email,
  //         "google",
  //       );
  //       expect(getUserRes.success).toBe(true);
  //       if (getUserRes.success) {
  //         expect(getUserRes.data).toBeNull();
  //       }
  //     }

  //     // Restore from dump
  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //         dump_path: dump.dumpPath,
  //       })
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //     expect(response.body.data).toBeDefined();
  //     expect(response.body.data.dump_path).toBe(dump.dumpPath);

  //     // Verify data was restored
  //     for (const email of testEmails) {
  //       const getUserRes = await getUserByEmailAndAuthType(
  //         pool,
  //         email,
  //         "google",
  //       );
  //       expect(getUserRes.success).toBe(true);
  //       if (getUserRes.success) {
  //         expect(getUserRes.data).not.toBeNull();
  //         if (getUserRes.data) {
  //           expect(getUserRes.data.email).toBe(email);
  //         }
  //       }
  //     }
  //   });

  //   it("should fail with invalid password", async () => {
  //     const dump = await createDump();

  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: "wrong_password",
  //         dump_path: dump.dumpPath,
  //       })
  //       .expect(401);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("UNAUTHORIZED");
  //     expect(response.body.msg).toBe("Invalid admin password");
  //   });

  //   it("should fail with missing password", async () => {
  //     const dump = await createDump();

  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         dump_path: dump.dumpPath,
  //       })
  //       .expect(401);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("UNAUTHORIZED");
  //     expect(response.body.msg).toBe("Admin password is required");
  //   });

  //   it("should fail with empty password", async () => {
  //     const dump = await createDump();

  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: "",
  //         dump_path: dump.dumpPath,
  //       })
  //       .expect(401);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("UNAUTHORIZED");
  //     expect(response.body.msg).toBe("Admin password is required");
  //   });

  //   it("should fail with missing dump_path", async () => {
  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //       })
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("INVALID_DUMP_PATH");
  //     expect(response.body.msg).toBe("dump_path parameter is required");
  //   });

  //   it("should fail with null dump_path", async () => {
  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //         dump_path: null,
  //       })
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("INVALID_DUMP_PATH");
  //     expect(response.body.msg).toBe("dump_path parameter is required");
  //   });

  //   it("should fail with empty string dump_path", async () => {
  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //         dump_path: "",
  //       })
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("INVALID_DUMP_PATH");
  //     expect(response.body.msg).toBe("dump_path parameter is required");
  //   });

  //   it("should fail with non-existent dump_path", async () => {
  //     const nonExistentPath = "/path/to/non/existent/dump.dump";

  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //         dump_path: nonExistentPath,
  //       })
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("DUMP_FILE_NOT_FOUND");
  //     expect(response.body.msg).toBe(
  //       `Dump file not found at path: ${nonExistentPath}`,
  //     );
  //   });

  //   it("should fail when dump_path points to a directory", async () => {
  //     const directoryPath = "/tmp";

  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //         dump_path: directoryPath,
  //       })
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("INVALID_DUMP_FILE");
  //     expect(response.body.msg).toBe(`Path is not a file: ${directoryPath}`);
  //   });

  //   it("should handle database configuration errors during restore", async () => {
  //     const dump = await createDump();

  //     const invalidApp = express();
  //     invalidApp.use(express.json());

  //     const pgDumpRouter = makePgDumpRouter();
  //     invalidApp.use("/pg_dump/v1", pgDumpRouter);

  //     process.env.DB_NAME = "non_existent_db";

  //     invalidApp.locals = makeUnsuccessfulAppStatus(pool);

  //     const response = await request(invalidApp)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //         dump_path: dump.dumpPath,
  //       })
  //       .expect(500);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("PG_RESTORE_FAILED");
  //     expect(response.body.msg).toContain("database");
  //   });

  //   it("should handle authentication errors during restore", async () => {
  //     const dump = await createDump();

  //     const invalidApp = express();
  //     invalidApp.use(express.json());

  //     const pgDumpRouter = makePgDumpRouter();
  //     invalidApp.use("/pg_dump/v1", pgDumpRouter);

  //     process.env.DB_PASSWORD = "wrong_password";

  //     invalidApp.locals = makeUnsuccessfulAppStatus(pool);

  //     const response = await request(invalidApp)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //         dump_path: dump.dumpPath,
  //       })
  //       .expect(500);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("PG_RESTORE_FAILED");
  //     expect(response.body.msg).toContain("authentication");
  //   });

  //   it("should handle non-existent dump file", async () => {
  //     const dump = await createDump();

  //     // Delete the dump file to simulate a missing file
  //     await fs.unlink(dump.dumpPath);

  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //         dump_path: dump.dumpPath,
  //       })
  //       .expect(400);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("DUMP_FILE_NOT_FOUND");
  //     expect(response.body.msg).toBe(
  //       `Dump file not found at path: ${dump.dumpPath}`,
  //     );
  //   });

  //   it("should handle corrupted dump file", async () => {
  //     const dump = await createDump();

  //     // Corrupt the dump file by writing invalid data
  //     await fs.writeFile(dump.dumpPath, "invalid dump data");

  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //         dump_path: dump.dumpPath,
  //       })
  //       .expect(500);

  //     expect(response.body.success).toBe(false);
  //     expect(response.body.code).toBe("PG_RESTORE_FAILED");
  //   });

  //   it("should handle relative dump_path", async () => {
  //     const dump = await createDump();

  //     // Get relative path from absolute path
  //     const relativePath = dump.dumpPath.replace(process.cwd(), ".");

  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //         dump_path: relativePath,
  //       })
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //     expect(response.body.data).toBeDefined();
  //     expect(response.body.data.dump_path).toBe(relativePath);
  //   });

  //   it("should handle absolute dump_path", async () => {
  //     const dump = await createDump();

  //     const response = await request(app)
  //       .post("/pg_dump/v1/restore")
  //       .send({
  //         password: testAdminPassword,
  //         dump_path: dump.dumpPath,
  //       })
  //       .expect(200);

  //     expect(response.body.success).toBe(true);
  //     expect(response.body.data).toBeDefined();
  //     expect(response.body.data.dump_path).toBe(dump.dumpPath);
  //   });
  // });
});
