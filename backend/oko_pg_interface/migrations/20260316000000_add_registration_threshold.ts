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

  // Add CHECK constraint: registration_threshold must be >= sss_threshold
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_registration_threshold_gte_sss'
      ) THEN
        ALTER TABLE public.key_share_node_meta
        ADD CONSTRAINT check_registration_threshold_gte_sss
        CHECK (registration_threshold IS NULL OR registration_threshold >= sss_threshold);
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema
    .withSchema("public")
    .hasColumn("key_share_node_meta", "registration_threshold");

  // Drop CHECK constraint first
  await knex.raw(`
    ALTER TABLE public.key_share_node_meta
    DROP CONSTRAINT IF EXISTS check_registration_threshold_gte_sss;
  `);

  if (hasColumn) {
    await knex.schema
      .withSchema("public")
      .alterTable("key_share_node_meta", (table) => {
        table.dropColumn("registration_threshold");
      });
  }
}
