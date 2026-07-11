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
    unoptimized: true,
  },

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default config;
