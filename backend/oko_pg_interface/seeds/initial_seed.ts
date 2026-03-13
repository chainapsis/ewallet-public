import type { Knex } from "knex";

import {
  createAdmin,
  createApiKeys,
  createCustomer,
  createCustomerDashboardUser,
  createKeyShareNodeMeta,
  createTssActivationSettings,
} from "./data/common";
import { KSNodeServerUrls as devKSNodeServerUrls } from "./data/dev";
import { KSNodeServerUrls as prodKSNodeServerUrls } from "./data/prod";

export async function seed(knex: Knex): Promise<void> {
  const isProd = process.env.TARGET === "prod";
  const ksNodeServerUrls = isProd ? prodKSNodeServerUrls : devKSNodeServerUrls;

  // Deletes ALL existing entries in reverse order of dependency
  await knex("wallet_ks_nodes").del();
  await knex("tss_stages").del();
  await knex("tss_sessions").del();
  await knex("server_keypairs").del();
  await knex("ks_node_logs").del();
  await knex("ks_node_health_checks").del();
  await knex("key_share_nodes").del();
  await knex("key_share_node_meta").del();
  await knex("oko_wallets").del();
  await knex("oko_users").del();
  await knex("email_verifications").del();
  await knex("customer_dashboard_users").del();
  await knex("api_keys").del();
  await knex("customers").del();
  await knex("admin_users").del();
  await knex("tss_activation_settings").del();

  // 1. Key Share Node Meta
  const keyShareNodeMeta = createKeyShareNodeMeta();
  await knex("key_share_node_meta").insert(keyShareNodeMeta);

  // 2. Admin Users
  const admin = await createAdmin();
  await knex("admin_users").insert(admin);

  // 3. Customers
  const customer = createCustomer();
  await knex("customers").insert({
    ...customer,
    url: customer.url || null,
    logo_url: customer.logo_url || null,
  });

  // 4. Customer Dashboard Users
  const customerDashboardUser = await createCustomerDashboardUser();
  await knex("customer_dashboard_users").insert(customerDashboardUser);

  // 5. API Keys
  const apiKeys = createApiKeys();
  await knex("api_keys").insert(apiKeys);

  // 6. Key Share Nodes
  const keyShareNodesData = ksNodeServerUrls.map((url, index) => ({
    node_name: `ks_node_${index + 1}`,
    server_url: url,
    status: "ACTIVE",
  }));
  await knex("key_share_nodes").insert(keyShareNodesData);

  // 7. TSS Activation Settings
  const tssActivationSettings = createTssActivationSettings();
  await knex("tss_activation_settings").insert(tssActivationSettings);
}
