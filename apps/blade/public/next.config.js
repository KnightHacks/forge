import { fileURLToPath } from "url";
import { createJiti } from "jiti";

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await createJiti(fileURLToPath(import.meta.url)).import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@forge/api",
    "@forge/auth",
    "@forge/db",
    "@forge/ui",
    "@forge/validators",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "minio-g0soogg4gs8gwcggw4ococok.knighthacks.org",
        pathname: "/knight-hacks-qr/**",
      },
    ],
    domains: ['forge/apps/blade/public'],
  },
};

export default config;
