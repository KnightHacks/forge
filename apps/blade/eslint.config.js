import baseConfig, { restrictEnvAccess } from "@forge/eslint-config/base";
import nextjsConfig from "@forge/eslint-config/nextjs";
import reactConfig from "@forge/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
  {
    rules: {
      "@typescript-eslint/prefer-nullish-coalescing": "off",
    },
  },
];
