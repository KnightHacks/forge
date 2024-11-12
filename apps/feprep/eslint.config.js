import baseConfig, { restrictEnvAccess } from "@blade/eslint-config/base";
import nextjsConfig from "@blade/eslint-config/nextjs";
import reactConfig from "@blade/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
