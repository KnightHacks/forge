import baseConfig, { restrictEnvAccess } from "@forge/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["dist/**"],
  },
  ...restrictEnvAccess,
  ...baseConfig,
];
