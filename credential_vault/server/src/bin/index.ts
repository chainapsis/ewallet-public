import { createPgDatabase } from "@keplr-ewallet-cv-server/database";
import { makeApp } from "@keplr-ewallet-cv-server/app";
import { loadEnvs } from "@keplr-ewallet-cv-server/envs";

async function main() {
  const env = loadEnvs();

  const createPostgresRes = await createPgDatabase({
    database: env.DB_NAME,
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    user: env.DB_USER,
    port: env.DB_PORT,
    ssl: env.DB_SSL,
  });

  if (createPostgresRes.success === false) {
    console.error(createPostgresRes.err);
    return createPostgresRes;
  }

  // @TODO: move to envs
  const port = env.COMMITTEE_ID === 1 ? 4201 : 4202;

  const app = makeApp();

  app.locals = {
    db: createPostgresRes.data,
    env,
  };

  app.listen(port, () => {
    console.log(`Server listening on port: %s`, port);
  });

  return;
}

main().then();
