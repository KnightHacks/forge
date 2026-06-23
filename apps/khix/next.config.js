/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default config;
