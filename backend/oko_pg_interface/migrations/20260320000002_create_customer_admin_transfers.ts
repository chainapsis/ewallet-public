import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("customer_admin_transfers", (table) => {
    table
      .uuid("transfer_id")
      .notNullable()
      .defaultTo(knex.raw("gen_random_uuid()"))
      .primary();
    table.uuid("customer_id").notNullable();
    table.uuid("from_user_id").notNullable();
    table.uuid("to_user_id").notNullable();
    table.string("token", 64).notNullable().unique();
    table.string("status", 32).notNullable().defaultTo("PENDING");
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(
      ["customer_id", "status"],
      "idx_admin_transfers_customer_status",
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("customer_admin_transfers");
}
