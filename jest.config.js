const nextJest = require("next/jest");
const dotenv = require("dotenv");
dotenv.config({
  path: ".env.development",
});

const createjestConfig = nextJest({
  dir: ".",
});

const jestConfig = createjestConfig({
  moduleDirectories: ["node_modules", "<rootDir>"],
  testTimeout: 60000,
  watchPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/.git/",
    "<rootDir>/dist/",
  ],
  maxWorkers: 1,
  testMatch: ["**/tests/**/*.test.js"],
});

module.exports = jestConfig;
