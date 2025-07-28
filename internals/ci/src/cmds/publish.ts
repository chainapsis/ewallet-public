import { execSync } from "node:child_process";

import { paths } from "../paths";

export async function publish(..._args: any[]) {
  console.info("Start publishing packages...");

  console.info(
    `1. Ensure you have "npm login"-ed in the first place. \
It's "npm login", not "yarn npm login".
2. git remote "origin" needs to be set up in case you use an alias.
3. Do "yarn ci version" first
`,
  );

  execSync("yarn lerna publish from-package --loglevel verbose", {
    cwd: paths.root,
    stdio: "inherit",
  });
}
