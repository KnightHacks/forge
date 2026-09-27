const MANAGED_ISSUE_IMAGE =
  /!\[([^\]]*)\]\(\/_managed\/issue-images\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\)/gi;

export const MAX_ISSUE_IMAGES = 10;

export function issueImageMarkdown(alt: string, attachmentId: string) {
  const safeAlt =
    alt
      .replaceAll("[", " ")
      .replaceAll("]", " ")
      .replaceAll("\\", " ")
      .trim() || "Issue image";
  return `![${safeAlt}](/_managed/issue-images/${attachmentId})`;
}

export function issueImageReferences(markdown: string) {
  return [...markdown.matchAll(MANAGED_ISSUE_IMAGE)].map((match) => ({
    alt: match[1] ?? "",
    attachmentId: match[2] ?? "",
    markdown: match[0],
  }));
}

export function issueImageIds(markdown: string) {
  return [
    ...new Set(
      issueImageReferences(markdown).map(({ attachmentId }) => attachmentId),
    ),
  ];
}
