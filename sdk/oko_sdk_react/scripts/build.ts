import path from "node:path";
import { fileURLToPath } from "node:url";
import commonjs from "@rollup/plugin-commonjs";
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
  replaceTscAliasPaths({
    configFile: path.resolve(PKG_ROOT, "tsconfig.json"),
  });

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
    input: {
      index: "src/index.ts",
      "eth/index": "src/eth/index.ts",
      "cosmos/index": "src/cosmos/index.ts",
      "svm/index": "src/svm/index.ts",
    },
    external: [
      "react",
      "react/jsx-runtime",
      "@oko-wallet/stdlib-js",
      "@oko-wallet/oko-types",
      /^@oko-wallet\/oko-types\//,
      "@oko-wallet/oko-sdk-core",
      "@oko-wallet/oko-sdk-eth",
      "@oko-wallet/oko-sdk-cosmos",
      "@oko-wallet/oko-sdk-svm",
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
      dir: "dist",
      format: "esm",
      sourcemap: true,
    },
  ];

  let bundle: RollupBuild;
  try {
    console.log(
      chalk.cyan("input: %s"),
      chalk.bold(JSON.stringify(inputOptions.input)),
    );
    bundle = await rollup(inputOptions);

    await generateOutputs(bundle, outputOptionsList);
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
  outputOptionsList: OutputOptions[],
) {
  for (const outputOptions of outputOptionsList) {
    console.log(chalk.green("generated → %s"), chalk.bold(outputOptions.dir));

    await bundle.write(outputOptions);
  }
}

main().then();
