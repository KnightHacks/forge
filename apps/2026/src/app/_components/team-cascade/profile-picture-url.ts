const PROFILE_PICTURE_ORIGIN =
  "https://minio-y44gsgsskc4ko4kkwsg0csoc.135.237.97.107.sslip.io";
const PROFILE_PICTURE_BUCKET_PATH = "/guild-profile-pictures/";
const USER_OWNED_OBJECT_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^/\\\0]+$/i;

function getProfilePictureObjectName(reference: string) {
  const trimmedReference = reference.trim();
  if (trimmedReference === "") return null;

  let objectName = trimmedReference;

  try {
    const url = new URL(trimmedReference);
    if (url.protocol !== "https:") return null;
    if (!url.pathname.startsWith(PROFILE_PICTURE_BUCKET_PATH)) return null;

    objectName = decodeURIComponent(
      url.pathname.slice(PROFILE_PICTURE_BUCKET_PATH.length),
    );
  } catch {
    // Current Guild uploads store the object key instead of a full URL.
  }

  if (objectName.length > 255 || objectName.includes("..")) return null;
  return USER_OWNED_OBJECT_NAME.test(objectName) ? objectName : null;
}

export function getKhixProfilePictureUrl(reference: string | null) {
  if (!reference) return null;

  const objectName = getProfilePictureObjectName(reference);
  if (!objectName) return null;

  const encodedObjectName = objectName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${PROFILE_PICTURE_ORIGIN}${PROFILE_PICTURE_BUCKET_PATH}${encodedObjectName}`;
}
