import { spawnSync } from "node:child_process";

import { expectSuccess } from "@oko-wallet-ci/expect";
import { paths } from "@oko-wallet-ci/paths";

export interface SetupArgs {
  skip_rust: boolean;
  skip_typecheck: boolean;
}

export async function setup(args: SetupArgs) {
  console.log(`
==========================================
            Oko Local CI Setup
==========================================

`);

  console.log("args: %j", args);

  const nodeRet = spawnSync("node", ["-v"], {
    cwd: paths.root,
    // stdio: "pipe",
    encoding: "utf-8",
  });
  expectSuccess(nodeRet, "format failed");

  const version = nodeRet.stdout.trim();
  const versionNum = Number(version.substring(1, 3));
  if (versionNum < 22) {
    throw new Error(`Node.js 22+ required. Current: ${version}`);
  }
  console.log("Node.js version: %s", version);

  const corepackRet = spawnSync("corepack", ["enable"], {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(corepackRet, "corepack enable failed");

  console.log("Installing dependencies...");
  const yarnInstallRet = spawnSync("yarn", ["install", "--immutable"], {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(yarnInstallRet, "yarn install failed");
  console.log("Node.js dependencies installed");

  const yarnBuildCSRet = spawnSync("yarn", ["ci", "build_cs"], {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(yarnBuildCSRet, "yarn build cs failed");

  const yarnBuildFrostRet = spawnSync("yarn", ["ci", "build_frost"], {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(yarnBuildFrostRet, "yarn build frost failed");

  const yarnBuildPkgsRet = spawnSync("yarn", ["ci", "build_pkgs"], {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(yarnBuildPkgsRet, "yarn build pkgs failed");

  const yarnBuildSDKRet = spawnSync("yarn", ["ci", "build_sdk"], {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(yarnBuildSDKRet, "yarn build sdk failed");

  if (!args.skip_rust) {
    const cargoCheckRet = spawnSync("cargo", ["check", "--workspace"], {
      cwd: paths.root,
      stdio: "inherit",
    });
    expectSuccess(cargoCheckRet, "cargo check failed");
  } else {
    console.log("Skipping cargo check (skip_rust)");
  }

  const dbMigrateKsnRet = spawnSync("yarn", ["ci", "db_migrate_ksn"], {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(dbMigrateKsnRet, "db migrate ksn failed");

  const dbMigrateApiRet = spawnSync("yarn", ["ci", "db_migrate_api"], {
    cwd: paths.root,
    stdio: "inherit",
  });
  expectSuccess(dbMigrateApiRet, "db migrate api failed");

  console.log(`Setup complete
You can now run: ./internals/tmux/tmux-e2e-start.sh
`);
}
