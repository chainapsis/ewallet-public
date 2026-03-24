import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("customer_dashboard_users", (table) => {
    table.string("role", 20).notNullable().defaultTo("admin");
  });

  await knex.raw(`
    ALTER TABLE customer_dashboard_users
    DROP CONSTRAINT IF EXISTS customer_dashboard_users_email_key
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX customer_dashboard_users_email_customer_id_key
    ON customer_dashboard_users (email, customer_id)
    WHERE status = 'ACTIVE'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS customer_dashboard_users_email_customer_id_key
  `);

  await knex.raw(`
    ALTER TABLE customer_dashboard_users
    ADD CONSTRAINT customer_dashboard_users_email_key UNIQUE (email)
  `);

  await knex.schema.alterTable("customer_dashboard_users", (table) => {
    table.dropColumn("role");
  });
}
