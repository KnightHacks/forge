/// <reference types="./types.d.ts" />

import * as path from "node:path";
import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * `import/no-relative-packages` needs a resolver this config does not install,
 * so the package boundary is enforced by pattern. A `../` hop landing in another
 * package's `src/` bypasses its exports map, hides the edge from Turbo's build
 * graph (which keys off `dependencies`), and can create cycles the build never
 * reports.
 *
 * Shared because ESLint rules replace rather than merge: `restrictEnvAccess`
 * also sets `no-restricted-imports`, and packages spread it after the base
 * config, so anything defined only in the base would be silently dropped in the
 * 13 packages that opt in — including `@forge/api` and `apps/blade`.
 */
const crossPackageImportPatterns = [
  {
    group: ["../*/src/*", "../../*/src/*", "../../../*/src/*"],
    message:
      "Import across packages through the package export (e.g. `@forge/consts`), not a relative path into its src/.",
  },
];

/**
 * All packages that leverage t3-env should use this rule
 */
export const restrictEnvAccess = tseslint.config(
  { ignores: ["**/env.ts"] },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Use `import { env } from '~/env'` instead to ensure validated types.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "process",
              importNames: ["env"],
              message:
                "Use `import { env } from '~/env'` instead to ensure validated types.",
            },
          ],
          patterns: crossPackageImportPatterns,
        },
      ],
    },
  },
);

export default tseslint.config(
  // Ignore files not tracked by VCS and any config files
  includeIgnoreFile(path.join(import.meta.dirname, "../../.gitignore")),
  { ignores: ["**/*.config.*"] },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    plugins: {
      import: importPlugin,
      turbo: turboPlugin,
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      ...turboPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-misused-promises": [
        2,
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        {
          allowConstantLoopConditions: true,
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
      "no-restricted-imports": [
        "error",
        { patterns: crossPackageImportPatterns },
      ],
      // Warnings, not errors, and ratcheted by `--max-warnings` in the lint
      // script: the eleven client components over 800 lines are a known,
      // scheduled refactor, so failing on them today would only teach people to
      // skip the gate. The ceiling can only go down.
      "max-lines": [
        "warn",
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "warn",
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
      "no-console": "error",
    },
  },
  {
    linterOptions: { reportUnusedDisableDirectives: true },
    languageOptions: { parserOptions: { projectService: true } },
  },
);
