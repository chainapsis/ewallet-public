import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("customer_team_invitations", (table) => {
    table
      .uuid("invitation_id")
      .notNullable()
      .defaultTo(knex.raw("gen_random_uuid()"))
      .primary();
    table.uuid("customer_id").notNullable();
    table.string("email", 255).notNullable();
    table.string("role", 20).notNullable();
    table.string("token", 64).notNullable().unique();
    table.string("status", 32).notNullable().defaultTo("PENDING");
    table.uuid("inviter_user_id").notNullable();
    table.timestamp("last_sent_at", { useTz: true }).nullable();
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(["customer_id", "status"], "idx_invitations_customer_status");
    table.index(["email"], "idx_invitations_email");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("customer_team_invitations");
}
