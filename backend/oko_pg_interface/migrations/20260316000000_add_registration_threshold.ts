import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema
    .withSchema("public")
    .hasColumn("key_share_node_meta", "registration_threshold");

  if (!hasColumn) {
    await knex.schema
      .withSchema("public")
      .alterTable("key_share_node_meta", (table) => {
        table.specificType("registration_threshold", "smallint");
      });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema
    .withSchema("public")
    .hasColumn("key_share_node_meta", "registration_threshold");

  if (hasColumn) {
    await knex.schema
      .withSchema("public")
      .alterTable("key_share_node_meta", (table) => {
        table.dropColumn("registration_threshold");
      });
  }
}
