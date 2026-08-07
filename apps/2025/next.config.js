/** @type {import("next").NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: ["@forge/ui"],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },

  /** Disable image optimization for static export */
  images: { qualities: [75, 100], unoptimized: true },
};

export default config;
