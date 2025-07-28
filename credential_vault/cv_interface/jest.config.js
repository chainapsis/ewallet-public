module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  moduleNameMapper: {},
  setupFilesAfterEnv: [
    // "<rootDir>/src/jest-setup.ts"
  ],
};
