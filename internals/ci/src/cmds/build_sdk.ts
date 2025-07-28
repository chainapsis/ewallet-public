import { execSync, spawnSync } from "node:child_process";

import { paths } from "../paths";

export async function buildSDK(..._args: any[]) {
  console.info("Start building SDKs...");

  console.info("Build sdk-core, path: %s", paths.sdk_core);
  execSync("yarn run build", {
    cwd: paths.sdk_core,
    stdio: "inherit",
  });
  console.info("Ok");

  console.info("Build sdk-cosmos, path: %s", paths.sdk_cosmos);
  execSync("yarn run build", {
    cwd: paths.sdk_cosmos,
    stdio: "inherit",
  });
  console.info("Ok");

  console.log("Build sdk-eth, path: %s", paths.sdk_eth);
  execSync("yarn run build", {
    cwd: paths.sdk_eth,
    stdio: "inherit",
  });
  console.info("Ok");

  console.info("All done!");
}
