import baseConfig, { restrictEnvAccess } from "@forge/eslint-config/base";
import nextjsConfig from "@forge/eslint-config/nextjs";
import reactConfig from "@forge/eslint-config/react";

/** @type {import("typescript-eslint").Config} */
export default [
  { ignores: [".next/**", "out/**"] },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
