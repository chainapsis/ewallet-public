import { spawnSync } from "node:child_process";
import chalk from "chalk";

import { expectSuccess } from "@oko-wallet-ci/expect";
import { paths } from "@oko-wallet-ci/paths";
import { getPkgName } from "@oko-wallet-ci/pkg_name";

export async function buildSDK(..._args: any[]) {
  await doBuildSDK();
}

export async function doBuildSDK() {
  // Order matters!
  const pkgsInOrder = [
    paths.sdk_core,
    paths.sdk_cosmos,
    paths.sdk_eth,
    paths.sdk_cosmos_kit,
    paths.sdk_svm,
  ];

  console.log("Building SDK packages, total (%s)", pkgsInOrder.length);

  for (const path of pkgsInOrder) {
    console.log("Building %s", path);

    const coreRet = spawnSync("yarn", ["run", "build"], {
      cwd: path,
      stdio: "inherit",
    });

    const name = await getPkgName(path);

    expectSuccess(coreRet, `build ${name} failed`);
    console.log("%s %s", chalk.bold.green("Done"), name);
  }

  console.log(
    "%s All (%s) done!",
    chalk.bold.green("Success"),
    pkgsInOrder.length,
  );
}
