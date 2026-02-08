export const ENDPOINT = "minio-g0soogg4gs8gwcggw4ococok.knighthacks.org";

export const QR_CONTENT_TYPE = "image/png";
export const QR_PATHNAME = "/knight-hacks-qr/**";

export const BUCKET_NAME = "knight-hacks-qr";
export const BUCKET_REGION = "us-east-1";
// TODO: check if this should be MB or MiB
export const MAX_RESUME_SIZE = 5 * 1000000; // 5MB

export const FORM_ASSETS_BUCKET = "form-assets";

export const PRESIGNED_URL_EXPIRY = 7 * 24 * 60 * 60; // 7 days

// TODO: see above
export const KNIGHTHACKS_MAX_PROFILE_PICTURE_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_PROFILE_PICTURE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const ALLOWED_PROFILE_PICTURE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
];
