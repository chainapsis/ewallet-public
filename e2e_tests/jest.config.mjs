import { createDefaultEsmPreset } from "ts-jest";

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  ...createDefaultEsmPreset(),
  testEnvironment: "node",
  // Run tests serially to avoid port conflicts since tests share the same ports
  maxWorkers: 1,
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  moduleNameMapper: {
    "^@e2e/(.*)$": "<rootDir>/src/$1",
    "^@oko-wallet-api/(.*)$": "<rootDir>/../backend/oko_api/server/src/$1",
    "^@oko-wallet-ksn-server/(.*)$":
      "<rootDir>/../key_share_node/server/src/$1",
    "^@oko-wallet-types/(.*)$": "<rootDir>/../common/oko_types/src/$1",
    "^@oko-wallet-oko-pg-interface/(.*)$":
      "<rootDir>/../backend/oko_pg_interface/src/$1",
  },
  transformIgnorePatterns: ["node_modules/(?!(@oko-wallet/.*)/)"],
};
