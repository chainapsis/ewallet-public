import { loadEnv, verifyEnv } from "@oko-wallet/dotenv";
import { createPgConn, type PgDatabaseConfig } from "@oko-wallet/postgres-lib";

import { ENV_FILE_NAME, envSchema } from "../envs";
import { createSeedData } from "./data";
import { createAdmin } from "@oko-wallet-oko-pg-interface/admin_users";
import { insertAPIKey } from "@oko-wallet-oko-pg-interface/api_keys";
import { insertCustomerDashboardUser } from "@oko-wallet-oko-pg-interface/customer_dashboard_users";
import { insertCustomer } from "@oko-wallet-oko-pg-interface/customers";
import { insertKeyShareNodeMeta } from "@oko-wallet-oko-pg-interface/key_share_node_meta";
import { insertKSNode } from "@oko-wallet-oko-pg-interface/ks_nodes";
import { insertTssActivationSetting } from "@oko-wallet-oko-pg-interface/tss_activate";

async function main() {
  const useEnv = process.env.USE_ENV === "true";
  if (useEnv) {
    console.log("Using env file config, loading env file: %s", ENV_FILE_NAME);
    loadEnv(ENV_FILE_NAME);
    const envRes = verifyEnv(envSchema, process.env);
    if (!envRes.success) {
      throw new Error(`Env variable invalid: ${envRes.err}`);
    }
  } else {
    console.log("Using test config");
  }

  const pgConfig: PgDatabaseConfig = {
    database: process.env.DB_NAME ?? "oko_dev",
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    ssl: process.env.DB_SSL === "true",
  };

  const target = process.env.TARGET || "dev";
  console.info(`target dataset: ${target}`);

  const connRes = await createPgConn(pgConfig);
  if (!connRes.success) {
    throw new Error(`Failed to connect to db: ${connRes.err}`);
  }
  const pool = connRes.data;

  console.info("Connected to db, config: %j", pgConfig);

  const seedData = await createSeedData(target);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const createKeyShareNodeMetaRes = await insertKeyShareNodeMeta(
      client,
      seedData.keyShareNodeMeta,
    );
    if (!createKeyShareNodeMetaRes.success) {
      throw new Error(createKeyShareNodeMetaRes.err);
    }
    console.info("Created key share node meta: %j", seedData.keyShareNodeMeta);

    const createAdminRes = await createAdmin(client, seedData.admin);
    if (!createAdminRes.success) {
      throw new Error(createAdminRes.err);
    }
    console.info("Created admin: %j", seedData.admin);

    const insertCustomerRes = await insertCustomer(client, seedData.customer);
    if (!insertCustomerRes.success) {
      throw new Error(insertCustomerRes.err);
    }
    console.info("Created customer: %j", seedData.customer);

    const insert_customer_dashboard_user_res =
      await insertCustomerDashboardUser(client, {
        ...seedData.customerDashboardUser,
      });
    if (!insert_customer_dashboard_user_res.success) {
      throw new Error(insert_customer_dashboard_user_res.err);
    }
    console.info(
      "Created customer dashboard user: %j",
      seedData.customerDashboardUser,
    );

    for (const apiKey of seedData.apiKeys) {
      const insertAPIKeyRes = await insertAPIKey(
        client,
        apiKey.customer_id,
        apiKey.hashed_key,
      );
      if (!insertAPIKeyRes.success) {
        throw new Error(insertAPIKeyRes.err);
      }
      console.info("Created api key: %j", apiKey);
    }

    for (const [i, serverUrl] of seedData.kSNodeServerUrls.entries()) {
      const createKSNodeRes = await insertKSNode(
        pool,
        `ks_node_${i + 1}`,
        serverUrl,
      );
      if (!createKSNodeRes.success) {
        throw new Error(createKSNodeRes.err);
      }
      console.info("Created ks node: %j", {
        name: `ks_node_${i + 1}`,
        serverUrl,
      });
    }

    const insertTssActivationSettingRes = await insertTssActivationSetting(
      pool,
      seedData.tssActivationSettings.activation_key,
      seedData.tssActivationSettings.is_enabled,
      seedData.tssActivationSettings.description ?? "",
    );

    if (!insertTssActivationSettingRes.success) {
      throw new Error(insertTssActivationSettingRes.err);
    }
    console.info(
      "Created tss activation setting: %j",
      seedData.tssActivationSettings,
    );

    await client.query("COMMIT");
  } catch (err) {
    console.error("Error seeding data, err: %s", err);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }

  console.info("Data: %j", [
    seedData.admin,
    seedData.customer,
    seedData.customerDashboardUser,
    seedData.apiKeys,
    seedData.kSNodeServerUrls,
    seedData.tssActivationSettings,
  ]);
  console.info("Seeding data is done successfully!");

  await pool.end();
}

main().then();
