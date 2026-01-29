import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  //
  // public.2_commit_reveal_sessions
  //
  const sessionsExists = await knex.schema
    .withSchema("public")
    .hasTable("2_commit_reveal_sessions");
  if (!sessionsExists) {
    await knex.schema
      .withSchema("public")
      .createTable("2_commit_reveal_sessions", (table) => {
        table
          .uuid("session_id")
          .notNullable()
          .primary({ constraintName: "2_commit_reveal_sessions_pkey" });
        table.string("operation_type", 32).notNullable();
        table
          .binary("client_ephemeral_pubkey")
          .notNullable()
          .unique({ indexName: "2_cr_sessions_client_pubkey_key" });
        table
          .string("id_token_hash", 64)
          .notNullable()
          .unique({ indexName: "2_cr_sessions_id_token_hash_key" });
        table.string("state", 16).notNullable().defaultTo("COMMITTED");
        table
          .timestamp("created_at", { useTz: true })
          .notNullable()
          .defaultTo(knex.fn.now());
        table.timestamp("expires_at", { useTz: true }).notNullable();
      });

    await knex.raw(`
      CREATE INDEX idx_2_cr_sessions_state
      ON public."2_commit_reveal_sessions" (state)
    `);
    await knex.raw(`
      CREATE INDEX idx_2_cr_sessions_expires_at
      ON public."2_commit_reveal_sessions" (expires_at)
    `);
  }

  //
  // public.2_commit_reveal_api_calls
  //
  const apiCallsExists = await knex.schema
    .withSchema("public")
    .hasTable("2_commit_reveal_api_calls");
  if (!apiCallsExists) {
    await knex.schema
      .withSchema("public")
      .createTable("2_commit_reveal_api_calls", (table) => {
        table
          .uuid("id")
          .notNullable()
          .defaultTo(knex.raw("gen_random_uuid()"))
          .primary({ constraintName: "2_commit_reveal_api_calls_pkey" });
        table.uuid("session_id").notNullable();
        table.string("api_name", 64).notNullable();
        table
          .binary("signature")
          .notNullable()
          .unique({ indexName: "2_cr_api_calls_signature_key" });
        table
          .timestamp("called_at", { useTz: true })
          .notNullable()
          .defaultTo(knex.fn.now());

        table.unique(["session_id", "api_name"], {
          indexName: "2_cr_api_calls_session_api_key",
        });
      });

    await knex.raw(`
      CREATE INDEX idx_2_cr_api_calls_session_id
      ON public."2_commit_reveal_api_calls" (session_id)
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .withSchema("public")
    .dropTableIfExists("2_commit_reveal_api_calls");
  await knex.schema
    .withSchema("public")
    .dropTableIfExists("2_commit_reveal_sessions");
}
