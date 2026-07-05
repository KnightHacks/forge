import { Client } from "minio";

import { storageEnv } from "../storage-env";

export const minioClient = new Client({
  endPoint: storageEnv.MINIO_ENDPOINT,
  port: 443,
  useSSL: true,
  accessKey: storageEnv.MINIO_ACCESS_KEY,
  secretKey: storageEnv.MINIO_SECRET_KEY,
});
