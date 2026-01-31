import { spawnSync } from "node:child_process";
import chalk from "chalk";

import { expectSuccess } from "@oko-wallet-ci/expect";
import { paths } from "@oko-wallet-ci/paths";
import { getPkgName } from "@oko-wallet-ci/pkg_name";

export async function buildPkgs(..._args: any[]) {
  await doBuildPkgs();
}

export async function doBuildPkgs() {
  // Order matters!
  const pkgsInOrder = [
    paths.stdlib,
    paths.dotenv,
    paths.crypto_bytes,
    paths.crypto_js,
    paths.oko_types,
    paths.teddsa_interface,
    paths.ksn_interface,
    paths.tecdsa_interface,
    paths.github,
  ];

  console.log("Building packages, total (%s)", pkgsInOrder.length);

  for (const path of pkgsInOrder) {
    console.log("Building %s", path);

    const coreRet = spawnSync("yarn", ["run", "build"], {
      cwd: path,
      stdio: "inherit",
      shell: true,
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
