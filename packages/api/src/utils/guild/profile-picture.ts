import {
  PROFILE_PICTURE_BUCKET_NAME,
  resolveProfilePictureObjectName,
} from "../profile-picture/security";
import { profilePictureStorageClient } from "../profile-picture/storage";

export interface PublicProfilePictureReference {
  profilePictureReference: string | null;
  userId: string;
}

export async function getPublicProfilePictureUrl({
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

    return await profilePictureStorageClient.presignedUrl(
      "GET",
      PROFILE_PICTURE_BUCKET_NAME,
      objectName,
      60 * 60,
    );
  } catch {
    return null;
  }
}
