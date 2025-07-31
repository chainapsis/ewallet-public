import { spawnSync } from "node:child_process";

import { paths } from "../paths";
import { expectSuccess } from "../expect";

export function buildPkgs(..._args: any[]) {
  doBuildPkgs();
}

export function doBuildPkgs() {
  console.info("Start building packages...");

  console.info("Build sdk-core, path: %s", paths.sdk_core);
  const coreRet = spawnSync("yarn", ["run", "build"], {
    cwd: paths.sdk_core,
    stdio: "inherit",
  });
  expectSuccess(coreRet, "build sdk core failed");
  console.info("Ok");

  console.info("Build sdk-cosmos, path: %s", paths.sdk_cosmos);
  const cosmosRet = spawnSync("yarn", ["run", "build"], {
    cwd: paths.sdk_cosmos,
    stdio: "inherit",
  });
  expectSuccess(cosmosRet, "build sdk cosmos failed");
  console.info("Ok");

  console.log("Build sdk-eth, path: %s", paths.sdk_eth);
  const ethRet = spawnSync("yarn", ["run", "build"], {
    cwd: paths.sdk_eth,
    stdio: "inherit",
  });
  expectSuccess(ethRet, "build sdk eth failed");
  console.info("Ok");

  console.info("Build crypto-bytes, path: %s", paths.crypto_bytes);
  const bytesRet = spawnSync("yarn", ["run", "build"], {
    cwd: paths.crypto_bytes,
    stdio: "inherit",
  });
  expectSuccess(bytesRet, "build crypto/bytes eth failed");
  console.info("Ok");

  console.info("All done!");
}
