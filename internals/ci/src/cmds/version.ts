import { execSync } from "node:child_process";

import { paths } from "../paths";
import { doBuildSDK } from "./build_sdk";

export async function version(..._args: any[]) {
  console.info("Start versioning packages...");

  console.info("We will build again just to make sure");

  doBuildSDK();

  execSync("yarn lerna version --no-private", {
    cwd: paths.root,
    stdio: "inherit",
  });
}
