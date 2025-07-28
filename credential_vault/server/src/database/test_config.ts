import type { PgDatabaseConfig } from ".";

export const testPgConfig: PgDatabaseConfig = {
  database: "credential_vault_dev",
  host: "localhost",
  password: "postgres",
  user: "postgres",
  port: 5432,
  ssl: false,
};

export const createTestPgConfig = (committeeId: number): PgDatabaseConfig => {
  return {
    database: `credential_vault_dev${committeeId}`,
    host: "localhost",
    password: "postgres",
    user: "postgres",
    port: 5432,
    ssl: false,
  };
};
