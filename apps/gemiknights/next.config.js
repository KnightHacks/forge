/** @type {import("next").NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: ["@forge/ui"],

  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default config;
