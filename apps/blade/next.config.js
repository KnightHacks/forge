/** @type {import("next").NextConfig} */
const config = {
  distDir: process.env.BLADE_E2E_AUTH === "true" ? ".next-e2e" : ".next",
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
