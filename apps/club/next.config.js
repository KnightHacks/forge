/** @type {import("next").NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.knighthacks.org",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: "https",
        hostname: "media.discordapp.net",
      },
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

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: ["@forge/ui"],
};

export default config;
