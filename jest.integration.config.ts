import type { Config } from "jest";
import { pathsToModuleNameMapper } from "ts-jest";
import ts from "typescript";

// Path aliases (e.g. the ones added by `nest g library`) live in tsconfig.json,
// so they are read from there instead of being duplicated here.
const { config: tsconfig } = ts.readConfigFile("./tsconfig.json", ts.sys.readFile);
const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: "test/integration/.*\\.integration-spec\\.ts$",
  testTimeout: 20000,
  maxWorkers: 1,
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: "<rootDir>/" }),
  collectCoverageFrom: ["src/**/*.(t|j)s", "libs/**/*.(t|j)s", "apps/**/*.(t|j)s", "!src/**/*.spec-support.ts"],
  coverageDirectory: "./coverage/integration",
  testEnvironment: "node",
};

export default config;
