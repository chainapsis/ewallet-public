// Executing this before any other statement
loadEnv(ENV_FILE_NAME);

import { loadEnv, verifyEnv } from "@oko-wallet/dotenv";
import { createServer } from "http";
import next from "next";
import { parse } from "url";

import { ENV_FILE_NAME, envSchema } from "@oko-wallet-demo-web/envs";

function main() {
  console.log("NODE_ENV: %s", process.env.NODE_ENV);

  const envRes = verifyEnv(envSchema, process.env);
  if (!envRes.success) {
    console.error("Env variable invalid\n%s", envRes.err);
    process.exit(1);
  }

  const dev = process.env.NODE_ENV !== "production";
  const app = next({ dev });
  const handle = app.getRequestHandler();

  const port = process.env.SERVER_PORT;

  app.prepare().then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    }).listen(port);

    console.info(`Server listening at http://localhost:${port}`);
  });
}

main();
