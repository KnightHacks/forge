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
    // Production profile-picture data is currently mixed: older rows store an
    // absolute MinIO URL, while new Guild uploads store an object key. This
    // normalizes either form to an owned object name and signs it through the
    // current storage client. Remove URL compatibility only after those older
    // rows have been migrated, or their existing portraits will disappear.
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
