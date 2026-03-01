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
    "@forge/consts",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "minio-g0soogg4gs8gwcggw4ococok.knighthacks.org",
      },
      {
        protocol: "https",
        hostname: "minio-y44gsgsskc4ko4kkwsg0csoc.135.237.97.107.sslip.io",
      },
    ],
  },
};

export default config;
