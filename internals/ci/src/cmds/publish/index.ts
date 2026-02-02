import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

import { expectSuccess } from "@oko-wallet-ci/expect";
import { paths } from "@oko-wallet-ci/paths";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NPM_TOKEN_FILENAME = "npm_token";

export async function publish(..._args: any[]) {
  console.log("Publishing packages...");

  console.log(`\
If you are running this locally,

1. Ensure you have "npm logged-in in the first place. \
It's "npm login", not "yarn npm login".
2. git remote "origin" needs to be set up in case you use an alias.
3. Pulishing should be preded by "yarn ci version".
4. As of Dec 2025, NPM requires "access token" to publish due to \
security issues.`);

  const tokenPath = path.resolve(__dirname, NPM_TOKEN_FILENAME);
  console.log("Searching NPM token file at %s", tokenPath);

  if (fs.existsSync(tokenPath)) {
    console.log("Found npm token file");

    let token = fs.readFileSync(tokenPath).toString();
    token = token.trim();

    console.log(
      "We will overwrite NPM_TOKEN with the value in this file, val: %s",
      token.substring(0, 8),
    );
    process.env.NPM_TOKEN = token;
  }

  if (process.env.NPM_TOKEN === undefined) {
    console.error(
      "%s We currently support publishing only with the access \
token.",
      chalk.bold.red("Error"),
    );

    process.exit(1);
  } else {
    console.log("NPM_TOKEN is provided");
  }

  const publishRet = spawnSync(
    "yarn",
    ["lerna", "publish", "from-package", "--yes", "--loglevel", "verbose"],
    {
      cwd: paths.root,
      stdio: "inherit",
    },
  );

  expectSuccess(publishRet, "publish failed");
}
