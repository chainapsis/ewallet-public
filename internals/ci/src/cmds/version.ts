import { execSync, spawnSync } from "node:child_process";

import { paths } from "../paths";

export async function version(..._args: any[]) {
  console.info("Start publishing packages...");

  console.info(`1. Ensure you have "npm login"-ed in the first place. \
It's "npm login", not "yarn npm login".
2. git remote "origin" needs to be set up in case you use an alias.
`);

  execSync("yarn lerna version --no-private", {
    cwd: paths.root,
    stdio: "inherit",
  });

  // console.info("Build sdk-cosmos, path: %s", paths.sdk_cosmos);
  // execSync("yarn run build", {
  //   cwd: paths.sdk_cosmos,
  //   stdio: "inherit",
  // });
  // console.info("Ok");
  //
  // console.info("All done!");
}
