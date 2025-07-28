import { spawnSync } from "node:child_process";

import { paths } from "../paths";

export async function typeCheck(..._args: any[]) {
  const pkgPaths = [paths.sdk_core, paths.sdk_cosmos, paths.sdk_eth];

  console.info("Type checking, pkgPaths: %j", pkgPaths);

  for (const pkg of pkgPaths) {
    console.info("Checking %s", pkg);

    const ret = spawnSync("yarn", ["run", "tsc", "--noEmit"], {
      cwd: pkg,
      stdio: "inherit",
    });

    if (ret.status === 0) {
      console.info("Ok");
    } else {
      console.error("Error type checking, pkg: %s", pkg);

      process.exit(ret.status);
    }
  }

  console.info(`All ${pkgPaths.length} ok!`);
}
