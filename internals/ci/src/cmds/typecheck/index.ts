import { spawn } from "node:child_process";
import chalk from "chalk";

import { paths } from "@oko-wallet-ci/paths";
import { getPkgName } from "@oko-wallet-ci/pkg_name";
import { runWithConcurrency } from "@oko-wallet-ci/concurrency";

const DEFAULT_CONCURRENCY = 4;

export async function typeCheck(..._args: any[]) {
  const pkgPaths = [
    paths.sdk_core,
    paths.sdk_cosmos,
    paths.sdk_eth,
    paths.sdk_svm,
    paths.ksn_server,
    paths.sandbox_simple_host,
    paths.sandbox_sol,
    paths.oko_api_server,
    paths.admin_api,
    paths.ct_dashboard_api,
    paths.oko_attached,
    paths.oko_pg_interface,
    paths.demo_web,
    paths.oko_admin_web,
    paths.ct_dashboard_web,
    paths.user_dashboard,
  ];

  // NOTE: Currently not used
  const _thoroughCheckPkgPaths = [
    ...pkgPaths,
    paths.example_cosmoskit_nextjs,
    paths.example_cosmos_nextjs,
    paths.example_evm_nextjs,
    paths.example_evm_wagmi_nextjs,
    paths.example_multi_ecosystem_react,
  ];

  const concurrency = DEFAULT_CONCURRENCY;

  console.log(
    "Type checking, total (%s), concurrency (%s)",
    pkgPaths.length,
    concurrency,
  );

  try {
    const since = Date.now();
    await runWithConcurrency(pkgPaths, runTypeCheck, concurrency);
    const now = Date.now();

    console.log("Took %sms", now - since);
    console.log(
      "%s",
      chalk.bold.green("Success"),
      `All ${pkgPaths.length} ok!`,
    );
  } catch (err: any) {
    console.log("%s type checking: %s", chalk.red.bold("Error"), err.message);
    process.exit(1);
  }
}

async function runTypeCheck(workerId: number, pkgPath: string): Promise<void> {
  const name = await getPkgName(pkgPath);
  console.log(
    "%s %s %s",
    chalk.blueBright.bold(`wk-${workerId}`),
    chalk.cyanBright.bold("Checking"),
    name,
  );

  return new Promise((resolve, reject) => {
    const child = spawn("yarn", ["run", "tsc", "--noEmit"], {
      cwd: pkgPath,
      stdio: "inherit",
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start tsc for ${name}: ${err.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(
          "%s %s %s",
          chalk.blueBright.bold(`wk-${workerId}`),
          chalk.bold.green("Ok"),
          name,
        );
        resolve();
      } else {
        reject(new Error(`Type check failed for ${name}`));
      }
    });
  });
}
