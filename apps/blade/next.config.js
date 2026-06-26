/** @type {import("next").NextConfig} */
const config = {
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
