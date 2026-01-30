import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

const config = [
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "esm",
      sourcemap: true,
    },
    external: [
      "@oko-wallet/oko-sdk-core",
      "@oko-wallet/stdlib-js",
      "@solana/web3.js",
      "eventemitter3",
      "uuid",
    ],
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.rollup.json",
        noEmitOnError: true,
      }),
    ],
  },
];

export default config;
