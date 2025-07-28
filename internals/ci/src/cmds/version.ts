import { execSync } from "node:child_process";

import { paths } from "../paths";
import { doBuildPkgs } from "./build_pkgs";

export async function version(..._args: any[]) {
  console.info("Start versioning packages...");

  console.info("We will build the packages here just to make sure");
  doBuildPkgs();

  execSync("yarn lerna version --no-private", {
    cwd: paths.root,
    stdio: "inherit",
  });
}
