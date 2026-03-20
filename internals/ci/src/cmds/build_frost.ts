import { spawnSync } from "node:child_process";
import chalk from "chalk";

import { expectSuccess } from "@oko-wallet-ci/expect";
import { paths } from "@oko-wallet-ci/paths";

export async function buildFrost(..._args: any[]) {
  console.log("Building FROST (tEdDSA)...");

  const teddsaAddonRet = spawnSync("yarn", ["run", "build"], {
    cwd: paths.teddsa_addon_addon,
    stdio: "inherit",
  });
  expectSuccess(teddsaAddonRet, "teddsa addon build failed");
  console.log("%s %s", chalk.bold.green("Done"), "teddsa addon");

  const wasmRet = spawnSync("yarn", ["run", "build:wasm"], {
    cwd: paths.frost_keplr_wasm,
    stdio: "inherit",
  });
  expectSuccess(wasmRet, "wasm build failed");
  console.log("%s %s", chalk.bold.green("Done"), "build wasm frost keplr");

  const copyRet = spawnSync("yarn", ["run", "copy_wasm"], {
    cwd: paths.oko_attached,
    stdio: "inherit",
  });
  expectSuccess(copyRet, "copy failed");
  console.log("%s %s", chalk.bold.green("Done"), "copy wasm");
}
