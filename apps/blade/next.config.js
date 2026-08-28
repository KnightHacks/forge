import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** @type {import("next").NextConfig} */
const config = {
  distDir: process.env.BLADE_E2E_AUTH === "true" ? ".next-e2e" : ".next",
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  reactStrictMode: true,
  transpilePackages: [
    "@forge/api",
    "@forge/auth",
    "@forge/db",
    "@forge/ui",
    "@forge/validators",
  ],
  typescript: { ignoreBuildErrors: true },
};

export default config;
