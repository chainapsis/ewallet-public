import { execSync } from "node:child_process";

import { paths } from "../paths";

export async function version(..._args: any[]) {
  console.info("Start versioning packages...");

  execSync("yarn lerna version --no-private", {
    cwd: paths.root,
    stdio: "inherit",
  });
}
