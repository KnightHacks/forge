import baseConfig, { restrictEnvAccess } from "@forge/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["dist/**"],
  },
  ...restrictEnvAccess,
  ...baseConfig,
  {
    // `scripts/` holds operational tools run from the repo root (`pnpm db:pull`,
    // `db:bootstrap`), not part of this package's published surface. They need
    // `@forge/api`'s MinIO client and `@forge/utils`'s Discord client, but both
    // of those depend on `@forge/db`, so declaring either dependency makes Turbo
    // reject the whole graph as cyclic. Until the scripts move to a root-level
    // home where the dependency direction is legal, the relative imports stay —
    // exempted deliberately here rather than passing silently everywhere.
    files: ["scripts/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
