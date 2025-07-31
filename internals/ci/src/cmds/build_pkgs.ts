import { spawnSync } from "node:child_process";

import { paths } from "../paths";
import { expectSuccess } from "../expect";

export function buildPkgs(..._args: any[]) {
  doBuildPkgs();
}

export function doBuildPkgs() {
  console.info("Start building packages");

  // Order matters!
  const pkgsInOrder = [
    [paths.stdlib, "stdlib-js"],
    [paths.sdk_core, "sdk core"],
    [paths.sdk_cosmos, "sdk cosmos"],
    [paths.sdk_eth, "sdk eth"],
    [paths.crypto_bytes, "crypto/bytes"],
  ];

  for (const [path, name] of pkgsInOrder) {
    console.info("Build %s, path: %s", name, paths.sdk_core);

    const coreRet = spawnSync("yarn", ["run", "build"], {
      cwd: path,
      stdio: "inherit",
    });

    expectSuccess(coreRet, `build ${name} failed`);
    console.info("Ok");
  }

  console.info("All (%s) done!", pkgsInOrder.length);
}
