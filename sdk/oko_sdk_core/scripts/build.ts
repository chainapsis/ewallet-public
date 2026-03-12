import path from "node:path";
import { fileURLToPath } from "node:url";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import chalk from "chalk";
import { deleteAsync } from "del";
import {
  type InputOptions,
  type OutputOptions,
  type RollupBuild,
  rollup,
} from "rollup";
import { replaceTscAliasPaths } from "tsc-alias";

import tsConfigJson from "../tsconfig.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, "..");

async function main() {
  console.log("Start build");

  await removeDirtyFiles();
  await bundle();
  replaceTscAlias();

  console.log("Done build");
}

async function removeDirtyFiles() {
  const TS_BUILD_INFO = "*.tsbuildinfo";
  const DIST = "dist";

  console.log("deleting: %s, %s", TS_BUILD_INFO, DIST);

  await deleteAsync([
    path.resolve(PKG_ROOT, DIST),
    path.resolve(PKG_ROOT, TS_BUILD_INFO),
  ]);
}

function replaceTscAlias() {
  replaceTscAliasPaths({ configFile: path.resolve(PKG_ROOT, "tsconfig.json") });

  console.log("Done tsc-alias");
}

async function bundle() {
  console.log("Start bundling");

  const srcPath = path.resolve(PKG_ROOT, "./src");

  const tsConfig = {
    ...tsConfigJson,
  };
  tsConfig.compilerOptions.rootDir = srcPath;
  tsConfig.include = [`${srcPath}/**/*`];

  const inputOptions: InputOptions = {
    input: "src/index.ts",
    external: ["@oko-wallet/stdlib-js", "@keplr-wallet/types"],
    plugins: [
      json(),
      nodeResolve(),
      typescript({
        ...tsConfig,
        noEmitOnError: true,
        outputToFilesystem: true,
      }),
    ],
  };

  const outputOptionsList: OutputOptions[] = [
    {
      file: "dist/index.js",
      format: "esm",
      sourcemap: true,
    },
    // {
    //   file: "dist/index.min.js",
    //   format: "esm",
    //   sourcemap: true,
    //   plugins: [terser()],
    // },
  ];

  let bundle: RollupBuild;
  try {
    console.log(chalk.cyan("input: %s"), chalk.bold(inputOptions.input));
    bundle = await rollup(inputOptions);

    await generateOutputs(bundle, inputOptions, outputOptionsList);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  if (bundle) {
    await bundle.close();
  }
}

async function generateOutputs(
  bundle: RollupBuild,
  inputOptions: InputOptions,
  outputOptionsList: OutputOptions[],
) {
  for (const outputOptions of outputOptionsList) {
    console.log(
      chalk.green("generated: %s → %s"),
      chalk.bold(inputOptions.input),
      chalk.bold(outputOptions.file),
    );

    await bundle.write(outputOptions);
  }
}

main().then();
