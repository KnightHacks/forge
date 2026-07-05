import { fileURLToPath } from "url";
import { createJiti } from "jiti";

await createJiti(fileURLToPath(import.meta.url)).import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    qualities: [72, 75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.knighthacks.org",
      },
    ],
  },

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@forge/api",
    "@forge/auth",
    "@forge/db",
    "@forge/hackathon",
    "@forge/ui",
    "@forge/validators",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default config;
