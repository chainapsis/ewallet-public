import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.withSchema("public").alterTable("oko_users", (table) => {
    table.jsonb("metadata").nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema("public").alterTable("oko_users", (table) => {
    table.dropColumn("metadata");
  });
}
