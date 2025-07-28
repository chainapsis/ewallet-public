import { createPgDatabase } from "@keplr-ewallet-cv-server/database";
import { makeApp } from "@keplr-ewallet-cv-server/app";
import { Envs } from "@keplr-ewallet-cv-server/envs";
import { localPorts } from "@keplr-ewallet/dev-env";

async function main() {
  const createPostgresRes = await createPgDatabase({
    database: Envs.DB_NAME,
    host: Envs.DB_HOST,
    password: Envs.DB_PASSWORD,
    user: Envs.DB_USER,
    port: Envs.DB_PORT,
    ssl: Envs.DB_SSL,
  });

  if (createPostgresRes.success === false) {
    console.error(createPostgresRes.err);
    return createPostgresRes;
  }

  const port =
    Envs.COMMITTEE_ID === 1
      ? localPorts.credential_vault
      : localPorts.credential_vault_2;

  const app = makeApp();

  app.locals = {
    db: createPostgresRes.data,
  };

  app.listen(port, () => {
    console.log(`Server listening on port: %s`, port);
  });

  return;
}

main().then();
