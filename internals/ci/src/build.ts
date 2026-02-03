import { spawn } from "node:child_process";
import chalk from "chalk";

import { getPkgName } from "@oko-wallet-ci/pkg_name";
import { runWithConcurrency } from "@oko-wallet-ci/concurrency";

/**
 * Builds packages in stages. Each stage runs concurrently,
 * but stages execute sequentially (stage N+1 waits for stage N).
 */
export async function buildInStages(stages: string[][], concurrency: number) {
  const totalPkgs = stages.flat().length;
  console.log(
    "Building packages in %s stages, total (%s)",
    stages.length,
    totalPkgs,
  );
  console.log("Concurrency (max): %s", concurrency);

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

        return new Promise((resolve, reject) => {
          const child = spawn("yarn", ["run", "build"], {
            cwd: pkgPath,
            // stdio: "inherit",
          });

          child.stdout.on("data", (data) => {
            console.log(
              "%s %s",
              chalk.blueBright.bold(`wk-${workerId}`),
              data.toString().trimEnd(),
            );
          });

          child.stderr.on("data", (data) => {
            console.log(
              "%s %s",
              chalk.blueBright.bold(`wk-${workerId}`),
              data.toString().trimEnd(),
            );
          });

          child.on("error", (err) => {
            reject(
              new Error(`wk-${workerId} \
Failed to build for ${name}: ${err.message}`),
            );
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
