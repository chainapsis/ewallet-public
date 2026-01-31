import { deleteAsync } from "del";
import path from "node:path";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import chalk from "chalk";
import {
  rollup,
  type InputOptions,
  type OutputOptions,
  type RollupBuild,
} from "rollup";
import { fileURLToPath } from "node:url";
import { replaceTscAliasPaths } from "tsc-alias";

import tsConfigJson from "../tsconfig.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, "..");

async function main() {
  console.log("Start building");

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

  const rollupTSConfig = {
    ...tsConfigJson,
  };
  rollupTSConfig.compilerOptions.rootDir = srcPath;
  rollupTSConfig.include = [`${srcPath}/**/*`];

  const inputOptions: InputOptions = {
    // input: "src/index.ts",
    // external: [
    //   "@oko-wallet/stdlib-js",
    //   "@keplr-wallet/types",
    //   "@oko-wallet/oko-sdk-core",
    //   "eventemitter3",
    //   "viem",
    //   "uuid",
    //   /^viem\//,
    //   /^ox\//,
    // ],
    // plugins: [
    //   json(),
    //   nodeResolve({
    //     preferBuiltins: false,
    //     browser: true,
    //   }),
    //   commonjs({
    //     include: /node_modules/,
    //     transformMixedEsModules: true,
    //   }),
    //   typescript({
    //     ...rollupTSConfig,
    //     noEmitOnError: true,
    //     outputToFilesystem: true,
    //   }),
    // ],

    input: "src/index.ts",
    // output: {
    //   file: "dist/index.js",
    //   format: "esm",
    //   sourcemap: true,
    // },
    external: [
      "@oko-wallet/oko-sdk-core",
      "@oko-wallet/stdlib-js",
      "@solana/web3.js",
      "eventemitter3",
      "uuid",
    ],
    plugins: [
      json(),
      nodeResolve({
        preferBuiltins: false,
        browser: true,
      }),
      commonjs({
        include: /node_modules/,
        transformMixedEsModules: true,
      }),
      typescript({
        ...rollupTSConfig,
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
