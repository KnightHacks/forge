import { MINIO } from "@forge/consts";

import {
  PROFILE_PICTURE_BUCKET_NAME,
  resolveProfilePictureObjectName,
} from "../profile-picture/security";

export interface PublicProfilePictureReference {
  profilePictureReference: string | null;
  userId: string;
}

export function getPublicProfilePictureUrl({
  profilePictureReference,
  userId,
}: PublicProfilePictureReference) {
  if (!profilePictureReference) return null;

  try {
    // Production still has roster members whose pictures were saved as full
    // MinIO URLs before Guild began saving object keys. Keep accepting both
    // forms until those rows are migrated, but always validate ownership and
    // return the same canonical public-bucket URL.
    const objectName = resolveProfilePictureObjectName(
      profilePictureReference,
      userId,
    );
    if (!objectName) return null;

    const encodedObjectName = objectName
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `https://${MINIO.ENDPOINT}/${PROFILE_PICTURE_BUCKET_NAME}/${encodedObjectName}`;
  } catch {
    return null;
  }
}
