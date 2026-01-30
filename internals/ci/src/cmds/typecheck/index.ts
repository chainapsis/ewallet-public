import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import chalk from "chalk";

import { paths } from "@oko-wallet-ci/paths";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WORKER_COUNT = 4;

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
    // paths.tss_api,
    paths.admin_api,
    paths.ct_dashboard_api,
    paths.oko_attached,
    paths.oko_pg_interface,
    paths.demo_web,
    paths.oko_admin_web,
    paths.ct_dashboard_web,
    // TODO: @rita only temporary until the update on the other package
    // "modular chain info" is done
    // paths.user_dashboard,
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

  console.log("Type checking, total (%s)", pkgPaths.length);

  const chunckedPaths = chunkArr(pkgPaths, WORKER_COUNT);

  const proms: Promise<number>[] = [];
  const workers: Worker[] = [];
  for (let idx = 0; idx < chunckedPaths.length; idx += 1) {
    const { worker, promise } = spawnWorker(
      `worker-${idx}`,
      chunckedPaths[idx],
    );

    proms.push(promise);
    workers.push(worker);
  }

  try {
    const since = Date.now();
    await Promise.all(proms);
    const now = Date.now();

    console.log("Took %sms", now - since);
    console.log(
      "%s",
      chalk.bold.green("Success"),
      `All ${pkgPaths.length} ok!`,
    );
  } catch (err: any) {
    console.log(
      "%s type checking, terminating all workers, original error: %s",
      chalk.red.bold("Error"),
      err,
    );

    for (let idx = 0; idx < workers.length; idx += 1) {
      workers[idx].terminate();
    }

    process.exit(1);
  }
}

export function spawnWorker(workerName: string, pkgPaths: string[]) {
  const scriptPath = join(__dirname, "./worker.ts");
  const scriptUrl = pathToFileURL(scriptPath).href;

  const worker = new Worker(
    // NOTE: Register runtime hook, if not, scripts in a worker thread run on
    // NodeJS runtime, not TSX (or any TypeScript runtime).
    `import('tsx/esm/api')
        .then(({ register }) => {
          register();
          import('${scriptUrl}')
        })`,
    {
      workerData: pkgPaths,
      eval: true,
    },
  );

  const promise = new Promise<number>((resolve, reject) => {
    console.log(
      "Spawn worker (%s), checking %s pkgs, script path: %s",
      workerName,
      pkgPaths.length,
      scriptUrl,
    );

    worker.on("message", (msg) => {
      console.log("%s %s", chalk.cyanBright.bold(workerName), msg);
    });

    worker.on("error", reject);

    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      } else {
        resolve(0);
      }
    });
  });

  return { worker, promise };
}

function chunkArr(arr: any[], chunkCount: number) {
  const ret: any[][] = [];
  for (let i = 0; i < chunkCount; i += 1) {
    ret.push([]);
  }

  let currArrIdx = 0;
  for (let i = 0; i < arr.length; i += 1) {
    ret[currArrIdx].push(arr[i]);

    currArrIdx = (currArrIdx + 1) % chunkCount;
  }

  return ret;
}
