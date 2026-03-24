// Executing this before any other statement
loadEnv(ENV_FILE_NAME);

import { loadEnv, verifyEnv } from "@oko-wallet/dotenv";
import { createServer as createViteServer } from "vite";

import { ENV_FILE_NAME, envSchema } from "../envs";

async function main() {
  console.log("NODE_ENV: %s", process.env.NODE_ENV);

  const envRes = verifyEnv(envSchema, process.env);
  if (!envRes.success) {
    console.error("Env variable invalid\n%s", envRes.err);
    process.exit(1);
  }

  const port = Number(process.env.SERVER_PORT || 3207);

  const server = await createViteServer({
    server: { port, strictPort: true },
  });

  await server.listen();
  console.info(`Server listening at http://localhost:${port}`);
}

main();
