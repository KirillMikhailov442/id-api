import { noRestrictedImports } from "./scripts/eslint-helpers.mjs";
import localPlugin from "./scripts/eslint-rules/index.mjs";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", "coverage/**", "logs/**", "static/**"]),
  {
    files: ["**/*.{js,cjs,mjs}"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "@stylistic": stylistic, "unused-imports": unusedImports, local: localPlugin },
    rules: {
      "@stylistic/max-len": [
        "warn",
        {
          code: 120,
          tabWidth: 2,
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: "*", next: ["if", "for", "switch", "try"] },
        { blankLine: "always", prev: ["if", "for", "switch", "try"], next: "*" },
        { blankLine: "always", prev: "*", next: ["const", "let", "var"] },
        { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
        { blankLine: "always", prev: "*", next: ["class", "function"] },
        { blankLine: "always", prev: ["class", "function"], next: "*" },
        { blankLine: "always", prev: "import", next: "*" },
        { blankLine: "any", prev: "import", next: "import" },
      ],
      "@stylistic/lines-between-class-members": [
        "error",
        {
          enforce: [
            { blankLine: "always", prev: "*", next: "*" },
            { blankLine: "never", prev: "field", next: "field" },
          ],
        },
      ],
      "@typescript-eslint/member-ordering": [
        "error",
        {
          default: [
            ["static-field", "static-initialization"],
            ["instance-field", "abstract-field"],
            "constructor",
            ["get", "set", "accessor"],
            "public-method",
            "protected-method",
            ["private-method", "#private-method"],
          ],
        },
      ],
      "@typescript-eslint/parameter-properties": ["error", { prefer: "parameter-property" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/return-await": ["error", "error-handling-correctness-only"],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],
      "no-inline-comments": "error",
      "no-restricted-imports": noRestrictedImports(),
    },
  },
  {
    files: [
      "src/**/infrastructure/entity/**/*.ts",
      "src/**/dto/**/*.ts",
      "src/shared/exception/response/**/*.ts",
      "src/shared/query/**/*.ts",
      "src/shared/pagination/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/parameter-properties": ["error", { prefer: "class-property" }],
      "local/decorator-newline": "error",
      "@stylistic/lines-between-class-members": ["error", "always"],
    },
  },
  {
    files: ["src/**/*.ts"],
    ignores: ["src/config/**"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: "Use ConfigService outside src/config/." },
      ],
    },
  },
  {
    files: ["src/modules/**/*.ts"],
    rules: {
      "no-restricted-imports": noRestrictedImports([
        { regex: "^@app(?:/|$)", message: "Modules must not depend on the application composition root." },
      ]),
    },
  },
  {
    files: ["src/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": noRestrictedImports([
        {
          regex: "^@(app|modules)(?:/|$)",
          message: "Shared code must not depend on feature modules or the composition root.",
        },
      ]),
    },
  },
  {
    files: ["src/config/**/*.ts"],
    rules: {
      "no-restricted-imports": noRestrictedImports([
        {
          regex: "^@(app|modules|shared)(?:/|$)",
          message: "Configuration must not depend on application or shared code.",
        },
      ]),
    },
  },
  {
    files: ["src/config/swagger.ts"],
    rules: {
      "no-restricted-imports": noRestrictedImports([
        {
          regex: "^@(app|shared)(?:/|$)",
          message: "Swagger configuration must not depend on application or shared code.",
        },
        {
          regex: "^@modules(?:$|/(?![^/]+/presentation/swagger/))",
          message: "Swagger configuration may only import controller Swagger registrations from modules.",
        },
      ]),
    },
  },
  {
    files: ["src/modules/*/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": noRestrictedImports([
        { regex: "^@(app|config)(?:/|$)", message: "The domain must remain independent of application configuration." },
        {
          regex: "^@modules/[^/]+/(application|infrastructure|presentation)(?:/|$)",
          message: "The domain must not depend on outer layers.",
        },
        {
          regex: "^(@nestjs/|typeorm(?:/|$)|express(?:/|$)|class-validator(?:/|$)|class-transformer(?:/|$))",
          message: "The domain must remain framework independent.",
        },
        {
          regex:
            "^@shared/(auth|mail|pagination|query|scheduled-tasks|security|transaction)(?:/|$)|^@shared/exception/(filter|factory|swagger)(?:/|$)",
          message: "The domain may only use framework-independent shared contracts and primitives.",
        },
      ]),
    },
  },
]);
