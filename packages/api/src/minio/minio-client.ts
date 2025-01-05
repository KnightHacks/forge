import { Client } from "minio";

import { env } from "../env";

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: 443,
  useSSL: true,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});
