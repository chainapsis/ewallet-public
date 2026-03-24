import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasThemeColumn: boolean = await knex.schema
    .withSchema("public")
    .hasColumn("customers", "theme");

  if (!hasThemeColumn) {
    return;
  }

  await knex.schema.withSchema("public").alterTable("customers", (table) => {
    table.dropColumn("theme");
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasThemeColumn: boolean = await knex.schema
    .withSchema("public")
    .hasColumn("customers", "theme");

  if (hasThemeColumn) {
    return;
  }

  await knex.schema.withSchema("public").alterTable("customers", (table) => {
    table.string("theme").notNullable().defaultTo("system");
  });
}
