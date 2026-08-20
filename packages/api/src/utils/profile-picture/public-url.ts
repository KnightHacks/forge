import { MINIO } from "@forge/consts";

import {
  PROFILE_PICTURE_BUCKET_NAME,
  resolveProfilePictureObjectName,
} from "./security";

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
