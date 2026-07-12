import { networkInterfaces } from "node:os";

const localDevOrigins = Object.values(networkInterfaces()).flatMap(
  (addresses) =>
    (addresses ?? [])
      .filter(({ family, internal }) => family === "IPv4" && !internal)
      .map(({ address }) => address),
);

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", ...localDevOrigins],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.knighthacks.org",
        pathname: "/khix/**",
      },
      {
        protocol: "https",
        hostname: "minio-y44gsgsskc4ko4kkwsg0csoc.135.237.97.107.sslip.io",
        pathname: "/guild-profile-pictures/**",
      },
    ],
  },

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default config;
