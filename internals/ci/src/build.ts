import { spawnSync } from "node:child_process";
import chalk from "chalk";

import { expectSuccess } from "@oko-wallet-ci/expect";
import { getPkgName } from "@oko-wallet-ci/pkg_name";
import { runWithConcurrency } from "@oko-wallet-ci/concurrency";

/**
 * Builds packages in stages. Each stage runs concurrently,
 * but stages execute sequentially (stage N+1 waits for stage N).
 */
export async function buildInStages(stages: string[][], concurrency = 4) {
  const totalPkgs = stages.flat().length;
  console.log(
    "Building packages in %s stages, total (%s)",
    stages.length,
    totalPkgs,
  );

  for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
    const stage = stages[stageIdx];
    console.log(
      chalk.blue("\nStage %s/%s: Building %s package(s)..."),
      stageIdx + 1,
      stages.length,
      stage.length,
    );

    await runWithConcurrency(
      stage,
      async (workerId, pkgPath) => {
        const name = await getPkgName(pkgPath);
        console.log(
          "%s Building %s",
          chalk.blueBright.bold(`wk-${workerId}`),
          name,
        );

        const ret = spawnSync("yarn", ["run", "build"], {
          cwd: pkgPath,
          stdio: "inherit",
        });

        expectSuccess(ret, `build ${name} failed`);
        console.log(
          "%s %s %s",
          chalk.blueBright.bold(`wk-${workerId}`),
          chalk.bold.green("Done"),
          name,
        );
      },
      Math.min(concurrency, stage.length),
    );
  }

  console.log(
    "\n%s All (%s) packages built!",
    chalk.bold.green("Success"),
    totalPkgs,
  );
}
