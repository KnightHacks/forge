const MANAGED_IMAGE =
  /!\[([^\]]*)\]\(\/_managed\/issue-images\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\)/gi;

export interface ManagedImageReference {
  alt: string;
  attachmentId: string;
  end: number;
  start: number;
}

export function managedImageReferences(value: string): ManagedImageReference[] {
  return [...value.matchAll(MANAGED_IMAGE)].map((match) => {
    const start = match.index;
    return {
      alt: match[1] ?? "",
      attachmentId: match[2] ?? "",
      end: start + match[0].length,
      start,
    };
  });
}

export function stripManagedImageReferences(value: string) {
  return value.replace(MANAGED_IMAGE, "").replace(/\n{3,}/g, "\n\n");
}

export function safeManagedImageAlt(value: string) {
  return value.replaceAll("[", " ").replaceAll("]", " ").replaceAll("\\", " ");
}

export function managedImageUploadFileName(
  fileName: string,
  extension: string,
) {
  return fileName.trim() || `pasted-image.${extension}`;
}
