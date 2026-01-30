/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.json",
      },
    ],
  },
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  testTimeout: 30000,
  moduleNameMapper: {
    "^@oko-wallet-sdk-sol/(.*)$": "<rootDir>/src/$1",
  },
};
