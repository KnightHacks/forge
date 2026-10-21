import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  reactStrictMode: true,
  transpilePackages: ["@forge/ui"],
};

export default config;
