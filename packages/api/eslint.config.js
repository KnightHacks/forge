import baseConfig, { restrictEnvAccess } from "@forge/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["dist/**"],
  },
  ...baseConfig,
  ...restrictEnvAccess,
  {
    rules: {
      "@typescript-eslint/prefer-nullish-coalescing": "off",
    },
  },
];
