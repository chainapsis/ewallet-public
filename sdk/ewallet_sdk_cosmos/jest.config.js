export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  testTimeout: 60000,
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/dist/", "<rootDir>/dist-test/"],
  moduleNameMapper: {
    "^@keplr-ewallet-sdk-cosmos/(.*)$": "<rootDir>/src/$1",
    "^@keplr-ewallet-sdk-core/(.*)$": "<rootDir>/../ewallet_sdk_core/src/$1",
  },
  setupFilesAfterEnv: [],
};
